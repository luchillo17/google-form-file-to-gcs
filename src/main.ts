function getOAuthClient() {
  const serviceAccount: ServiceAccountI = JSON.parse(
    PropertiesService.getScriptProperties().getProperty("serviceAccount")
  );
  const [bucket, formFilesFolder] = PropertiesService.getScriptProperties()
    .getProperty("formFilesPath")
    .split("/");

  // Construct JWT
  const now = Math.floor(Date.now() / 1e3);
  const jwtHeader = { alg: "RS256", typ: "JWT" };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: (now + 3600).toString(),
    iat: now.toString(),
  };

  const signature =
    Utilities.base64Encode(JSON.stringify(jwtHeader)) +
    "." +
    Utilities.base64Encode(JSON.stringify(claimSet));
  const jwt =
    signature +
    "." +
    Utilities.base64Encode(
      Utilities.computeRsaSha256Signature(signature, serviceAccount.private_key)
    );

  // Get an access token
  const tokenResponse = UrlFetchApp.fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "post",
      payload: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      },
    }
  );
  const accessToken = JSON.parse(tokenResponse.getContentText()).access_token;

  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?project=${serviceAccount.project_id}&prefix=${formFilesFolder}`;

  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const result = JSON.parse(res.getContentText());

  console.log("Result: ", result);
}
