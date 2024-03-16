interface IServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

interface IUploadResponse {
  id: string; //"employee-shared/form-files/20240315_183943 - Saray Lopez Jaramillo.heic/1710556887802846";
  kind: string; //"storage#object";
  selfLink: string; //"https://www.googleapis.com/storage/v1/b/employee-shared/o/form-files%2F20240315_183943%20-%20Saray%20Lopez%20Jaramillo.heic";
  mediaLink: string; //"https://storage.googleapis.com/download/storage/v1/b/employee-shared/o/form-files%2F20240315_183943%20-%20Saray%20Lopez%20Jaramillo.heic?generation=1710556887802846&alt=media";
  name: string; //"form-files/20240315_183943 - Saray Lopez Jaramillo.heic";
  bucket: string; //"employee-shared";
  generation: string; //"1710556887802846";
  metageneration: string;
  contentType: string; //"image/heif";
  storageClass: string;
  size: string;
  md5Hash: string;
  crc32c: string;
  etag: string;
  timeCreated: string;
  updated: string;
  timeStorageClassUpdated: string;
}
