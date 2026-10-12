import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 5001),
  jwtSecret: process.env.JWT_SECRET || "glbitm-dev-secret-change-me",
  adminUser: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  sheetId: process.env.GOOGLE_SHEET_ID || "",
  sheetRange: process.env.GOOGLE_SHEET_RANGE || "Sheet1!A:N",
  serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "./credentials/service-account.json"
};
