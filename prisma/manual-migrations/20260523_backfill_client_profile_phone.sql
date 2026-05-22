UPDATE "users" AS u
SET "phone" = sr."clientPhone"
FROM (
  SELECT DISTINCT ON ("clientId") "clientId", "clientPhone"
  FROM "service_requests"
  WHERE "clientId" IS NOT NULL
    AND "clientPhone" IS NOT NULL
    AND trim("clientPhone") <> ''
  ORDER BY "clientId", "createdAt" DESC
) AS sr
WHERE u."id" = sr."clientId"
  AND u."phone" IS NULL;
