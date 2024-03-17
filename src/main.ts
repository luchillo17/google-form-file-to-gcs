let token: string;
let serviceAccount: IServiceAccount;
let storageService: GoogleAppsScriptOAuth2.OAuth2Service;
let spreadSheet: GoogleAppsScript.Spreadsheet.Sheet;

function installOnFormSubmitSheet() {
  const triggerPropertyName = "onFormSubmitSheetUniqueId";

  let propTriggerId =
    PropertiesService.getScriptProperties().getProperty(triggerPropertyName);

  if (propTriggerId) {
    const trigger = ScriptApp.getProjectTriggers().find(
      (trigger) => trigger.getUniqueId() === propTriggerId
    );

    if (trigger) {
      console.log(
        `Trigger with the following unique ID already exists: ${propTriggerId}`
      );
      return;
    }
  }

  // Creates the trigger if one doesn't exist.
  const sheet = SpreadsheetApp.getActive();
  const form = FormApp.openByUrl(sheet.getFormUrl());
  propTriggerId = ScriptApp.newTrigger("onFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create()
    .getUniqueId();

  PropertiesService.getScriptProperties().setProperty(
    triggerPropertyName,
    propTriggerId
  );

  console.log(
    `Trigger with the following unique ID was created: ${propTriggerId}`
  );
}

function getServiceAccountProperty(): IServiceAccount {
  return (
    serviceAccount ??
    JSON.parse(
      PropertiesService.getScriptProperties().getProperty("serviceAccount")
    )
  );
}

function getStorageService(): GoogleAppsScriptOAuth2.OAuth2Service {
  const serviceAccount = getServiceAccountProperty();

  return (
    storageService ??
    OAuth2.createService("CloudStorage")
      .setPrivateKey(serviceAccount.private_key)
      .setIssuer(serviceAccount.client_email)
      .setPropertyStore(PropertiesService.getUserProperties())
      .setCache(CacheService.getUserCache())
      .setTokenUrl("https://oauth2.googleapis.com/token")
      .setScope("https://www.googleapis.com/auth/devstorage.read_write")
  );
}

function getAccessToken(): string {
  return token ?? getStorageService().getAccessToken();
}

function getBucketData() {
  const [bucket, formFilesFolder] = PropertiesService.getScriptProperties()
    .getProperty("formFilesPath")
    .split("/");

  if (
    typeof bucket !== "string" ||
    typeof formFilesFolder !== "string" ||
    bucket.trim() === "" ||
    formFilesFolder.trim() === ""
  ) {
    throw new Error(`formFilesPath invalid: ${bucket}, ${formFilesFolder}`);
  }

  const accessToken = getAccessToken();

  if (typeof accessToken !== "string" || accessToken.trim() === "") {
    throw new Error("Empty token");
  }

  const serviceAccount = getServiceAccountProperty();

  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?project=${serviceAccount.project_id}&prefix=${formFilesFolder}`;

  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const result = JSON.parse(res.getContentText());

  console.log("Result: ", result);
}

function onFormSubmit(event: {
  response: GoogleAppsScript.Forms.FormResponse;
}) {
  try {
    // Get file uploads
    const responseItems = event.response.getItemResponses();

    const fileType = FormApp.ItemType.FILE_UPLOAD;

    const driveFileIds = responseItems
      .filter((item) => item.getItem().getType() === fileType)
      .flatMap((item) => item.getResponse() as string | string[]);

    uploadDriveTo(event.response, driveFileIds);
  } catch (error) {
    console.error(error);
  }
}

function getResponseSheetRow(responseTimestamp: GoogleAppsScript.Base.Date) {
  spreadSheet = spreadSheet ?? SpreadsheetApp.getActiveSheet();

  // Find row by timestamp
  const rows = spreadSheet.getDataRange();
  const values = rows.getValues();

  const rangeRowIndex = values.findIndex(
    (row) => row[0].valueOf() == responseTimestamp.valueOf()
  );
  const rowIndex = rows.getRow() + rangeRowIndex;

  return spreadSheet.getRange(
    rowIndex,
    rows.getColumn(),
    1,
    rows.getLastColumn()
  );
}

function replaceSheetFileResponse(
  row: GoogleAppsScript.Spreadsheet.Range,
  driveFile: GoogleAppsScript.Drive.File,
  gcsUrl: string
) {
  const driveCell = row.createTextFinder(driveFile.getId()).findNext();

  if (!driveCell) {
    throw new Error(`No drive url found with ID ${driveFile.getId()}`);
  }

  driveCell.setValue(gcsUrl);
  driveFile.setTrashed(true);
}

function uploadDriveTo(
  response: GoogleAppsScript.Forms.FormResponse,
  driveFileIds: string[]
) {
  if (driveFileIds.length <= 0) {
    throw new Error("No files sent in form");
  }

  const [bucket, formFilesFolder] = PropertiesService.getScriptProperties()
    .getProperty("formFilesPath")
    .split("/");

  if (
    typeof bucket !== "string" ||
    typeof formFilesFolder !== "string" ||
    bucket.trim() === "" ||
    formFilesFolder.trim() === ""
  ) {
    throw new Error(`formFilesPath invalid: ${bucket}, ${formFilesFolder}`);
  }

  const accessToken = getAccessToken();

  if (typeof accessToken !== "string" || accessToken.trim() === "") {
    throw new Error("Empty token");
  }

  const responseRow = getResponseSheetRow(response.getTimestamp());

  for (let fileId of driveFileIds) {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const bytes = blob.getBytes();

    const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${formFilesFolder}/${file.getName()}`;

    console.log("Url: ", url);

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: blob.getContentType(),
      payload: bytes,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result: IUploadResponse = JSON.parse(res.getContentText());

    // Update urls in Sheets
    replaceSheetFileResponse(responseRow, file, result.mediaLink);

    console.log("Drive moved to GCS successfully");
  }
}
