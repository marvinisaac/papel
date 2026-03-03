export function registerGlobalShortcuts(handlers: {
  newNote: () => void;
  saveNote: () => void;
}) {
  function onKeydown(event: KeyboardEvent) {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const ctrlOrMeta = isMac ? event.metaKey : event.ctrlKey;
    if (!ctrlOrMeta) return;

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      handlers.newNote();
    }

    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      handlers.saveNote();
    }
  }

  window.addEventListener('keydown', onKeydown);

  return () => {
    window.removeEventListener('keydown', onKeydown);
  };
}
