/**
 * Environment guard shared by development-only tools and routes.
 *
 * REPLIT_ENVIRONMENT is intentionally not consulted here. It can report
 * "production" for a development workspace, whereas these are the documented
 * markers for a published deployment.
 */
export type DevelopmentEnvironment = Partial<
  Record<
    | "NODE_ENV"
    | "REPLIT_DEPLOYMENT"
    | "REPLIT_DEPLOYMENT_ID"
    | "REPLIT_ENV"
    | "REPLIT_ENVIRONMENT",
    string | undefined
  >
>;

export function isDevelopmentOutsideDeployment(
  environment: DevelopmentEnvironment = process.env,
): boolean {
  return (
    environment.NODE_ENV === "development" &&
    !environment.REPLIT_DEPLOYMENT &&
    !environment.REPLIT_DEPLOYMENT_ID &&
    !environment.REPLIT_ENV
  );
}

export function assertDevelopmentOutsideDeployment(
  environment: DevelopmentEnvironment = process.env,
): void {
  if (!isDevelopmentOutsideDeployment(environment)) {
    throw new Error(
      "This operation is restricted to an explicit development process outside a Replit deployment",
    );
  }
}