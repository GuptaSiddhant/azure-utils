export const SERVICE_NAME = "storybooks";

export const DEFAULT_CONTAINER_NAME = SERVICE_NAME;

export const DEFAULT_STORAGE_CONN_STR_ENV_VAR = "AzureWebJobsStorage";

export const DEFAULT_PURGE_SCHEDULE_CRON = "0 0 0 * * *";

export const CACHE_CONTROL_PUBLIC_YEAR = "public, max-age=31536000, immutable";

export const DEFAULT_PURGE_AFTER_DAYS = 30;

export const CONTENT_TYPES = {
  ANY: "*/*",
  JSON: "application/json",
  HTML: "text/html",
  ZIP: "application/zip",
  FORM_MULTIPART: "multipart/form-data",
  FORM_ENCODED: "application/x-www-form-urlencoded",
};
export const SUPPORTED_CONTENT_TYPES = Object.values(CONTENT_TYPES);
export const SUPPORTED_CONTENT_TYPES_MSG = `Only following content-type supported: ${SUPPORTED_CONTENT_TYPES.join(
  ", "
)}.`;
