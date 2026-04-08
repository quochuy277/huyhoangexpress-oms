type HeaderQueryPolicyArgs = {
  isShellReady: boolean;
  bellOpen: boolean;
};

export function getHeaderQueryPolicy({ isShellReady, bellOpen }: HeaderQueryPolicyArgs) {
  return {
    shellBootstrapEnabled: isShellReady || bellOpen,
    remindersEnabled: bellOpen,
    announcementsEnabled: bellOpen,
  };
}
