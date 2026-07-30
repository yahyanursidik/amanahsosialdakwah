export type RequestContext = {
  membershipId: string;
  organizationId: string;
  permissions: Set<string>;
  profileId: string;
  requestId: string;
  userId: string;
};

export type AppEnv = {
  Variables: {
    requestContext: RequestContext;
    requestId: string;
  };
};
