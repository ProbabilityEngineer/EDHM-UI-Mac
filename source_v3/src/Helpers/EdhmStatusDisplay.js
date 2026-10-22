// Installation checks do not verify shader operation in the running game.
export function getEdhmStatusDisplay(status) {
  if (status?.conflict) {
    return {
      label: 'EDHM Needs Repair',
      detail: 'Required EDHM DLLs are missing or duplicated. Reinstall EDHM to repair the installation.',
      className: 'text-danger',
    };
  }
  switch (status?.state) {
    case 'ready':
      return {
        label: 'EDHM Installed',
        detail: 'Required EDHM DLLs are present and enabled. In-game operation has not been verified.',
        className: 'text-success',
      };
    case 'disabled':
      return {
        label: 'EDHM Disabled',
        detail: 'EDHM is installed but its DLL pair is not fully enabled.',
        className: 'text-warning',
      };
    case 'not_installed':
      return {
        label: 'EDHM Not Installed',
        detail: 'No EDHM proxy DLLs were detected for the selected game. Use Install EDHM to install them.',
        className: 'text-warning',
      };
    default:
      return {
        label: 'EDHM Status Unknown',
        detail: 'The installation status has not been determined.',
        className: 'text-secondary',
      };
  }
}
