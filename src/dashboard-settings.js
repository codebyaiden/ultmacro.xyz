(() => {
  const page = document.querySelector('.dashboard-settings-page');
  if (!page) return;
  const preferences = window.ultimateMacroDashboardPreferences;
  if (!preferences) return;
  const feedback = page.querySelector('[data-settings-status]');
  const dialog = page.querySelector('[data-background-dialog]');
  const gallery = page.querySelector('[data-background-gallery]');
  const galleryStatus = page.querySelector('[data-background-status]');
  const selectorPreview = page.querySelector('[data-background-preview]');
  const selectorName = page.querySelector('[data-background-name]');
  const uploadInput = page.querySelector('[data-background-upload]');
  const removeUpload = page.querySelector('[data-remove-background]');
  const presets = {
    accent: [
      ['Violet', '#b9a3db'], ['Blue', '#8bbcff'], ['Mint', '#8fd8b5'], ['Rose', '#e99eb3'],
      ['Amber', '#f4bd78'], ['Ice', '#9bdbe7'], ['Lilac', '#d4a6f5'], ['White', '#e9e7ee']
    ],
    icon: [
      ['Soft white', '#e9e7ee'], ['Violet', '#c8afea'], ['Sky', '#a9cfff'], ['Mint', '#a6dfc2'],
      ['Rose', '#f0b9c8'], ['Warm', '#f2d0a0'], ['Silver', '#b9bdc8'], ['Blue', '#82aaf5']
    ]
  };
  let pickerState = { accent: { hue: 270, saturation: 25, value: 86 }, icon: { hue: 270, saturation: 15, value: 92 } };
  let statusTimer = 0;
  let previousFocus = null;

  const say = (message) => {
    if (!feedback) return;
    feedback.textContent = message;
    window.clearTimeout(statusTimer);
    if (message) statusTimer = window.setTimeout(() => { feedback.textContent = ''; }, 2200);
  };
  const backgroundOption = id => preferences.backgroundOptions.find(item => item.id === id);
  const markSaved = () => say('Saved on this device.');

  function updateButtons() {
    page.querySelectorAll('[data-setting]').forEach(group => {
      const selected = preferences[group.dataset.setting];
      group.querySelectorAll('button[data-value]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.value === selected));
      });
    });
    page.querySelector('[data-accent-control]').hidden = preferences.accentMode !== 'custom';
    page.querySelector('[data-icon-control]').hidden = preferences.iconMode !== 'custom';
    syncColorPicker('accent');
    syncColorPicker('icon');
    const dim = page.querySelector('[data-background-dim]');
    dim.value = preferences.backgroundDim;
    dim.style.setProperty('--slider-fill', `${((preferences.backgroundDim - Number(dim.min)) / (Number(dim.max) - Number(dim.min))) * 100}%`);
    page.querySelector('[data-background-dim-value]').value = `${preferences.backgroundDim}%`;
    const active = preferences.background === 'custom'
      ? { name: preferences.customBackgroundName || 'Your image', image: preferences.customBackgroundUrl }
      : backgroundOption(preferences.background) || backgroundOption('dead-ahead');
    selectorName.textContent = active.name;
    selectorPreview.style.backgroundImage = active.image ? `url("${active.image}")` : 'none';
    selectorPreview.dataset.empty = String(!active.image);
    removeUpload.hidden = !preferences.customBackgroundName;
    renderGallery();
  }

  function hsvToHex({ hue, saturation, value }) {
    const s = saturation / 100, v = value / 100, c = v * s, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = v - c;
    const channels = hue < 60 ? [c,x,0] : hue < 120 ? [x,c,0] : hue < 180 ? [0,c,x] : hue < 240 ? [0,x,c] : hue < 300 ? [x,0,c] : [c,0,x];
    return `#${channels.map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
  }
  function hexToHsv(hex) {
    const value = /^#([\da-f]{6})$/i.exec(hex)?.[1];
    if (!value) return null;
    const [r,g,b] = [0,2,4].map(index => parseInt(value.slice(index,index+2),16)/255);
    const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max-min;
    let hue = 0;
    if (delta) hue = max === r ? 60 * (((g-b)/delta)%6) : max === g ? 60 * ((b-r)/delta+2) : 60 * ((r-g)/delta+4);
    return { hue: (hue+360)%360, saturation: max ? delta/max*100 : 0, value: max*100 };
  }
  function syncColorPicker(kind) {
    const value = kind === 'accent' ? preferences.customAccent : preferences.customIconColor;
    pickerState[kind] = hexToHsv(value) || pickerState[kind];
    const state = pickerState[kind], hex = hsvToHex(state).toUpperCase();
    const field = page.querySelector(`[data-color-field="${kind}"]`);
    field.style.setProperty('--picker-hue', `hsl(${state.hue} 100% 50%)`);
    field.style.setProperty('--picker-x', `${state.saturation}%`);
    field.style.setProperty('--picker-y', `${100-state.value}%`);
    field.setAttribute('aria-valuenow', String(Math.round(state.saturation)));
    page.querySelector(`[data-color-hue="${kind}"]`).value = Math.round(state.hue);
    page.querySelector(`[data-color-hex="${kind}"]`).value = hex;
    page.querySelector(`[data-color-code="${kind}"]`).textContent = hex;
    page.querySelector(`[data-color-current="${kind}"]`).style.backgroundColor = hex;
    const host = page.querySelector(`[data-color-presets="${kind}"]`);
    host.replaceChildren(...presets[kind].map(([name, color]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'settings-color-preset';
      button.style.setProperty('--preset-color', color); button.setAttribute('aria-label', name);
      button.title = name; button.setAttribute('aria-pressed', String(color.toLowerCase() === value.toLowerCase()));
      button.addEventListener('click', () => saveColor(kind, color));
      return button;
    }));
  }
  function saveColor(kind, color) {
    const field = kind === 'accent' ? 'customAccent' : 'customIconColor';
    const mode = kind === 'accent' ? 'accentMode' : 'iconMode';
    preferences.save({ [field]: color, [mode]: 'custom' });
    updateButtons(); markSaved();
  }
  function updateColorPreview(kind, state) {
    pickerState[kind] = state;
    const color = hsvToHex(state);
    const field = kind === 'accent' ? 'customAccent' : 'customIconColor';
    preferences.preview({ [field]: color });
    syncColorPicker(kind);
  }

  function renderGallery() {
    if (!gallery) return;
    gallery.replaceChildren();
    const choices = [...preferences.backgroundOptions];
    if (preferences.customBackgroundName) {
      choices.splice(1, 0, {
        id: 'custom', name: preferences.customBackgroundName,
        image: preferences.customBackgroundUrl || '', custom: true
      });
    }
    choices.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'background-choice';
      button.dataset.selected = String(preferences.background === option.id);
      button.setAttribute('aria-pressed', String(preferences.background === option.id));
      button.setAttribute('aria-label', `${option.name}${preferences.background === option.id ? ', selected' : ''}`);
      const preview = document.createElement('span');
      preview.className = 'background-choice-preview';
      preview.style.backgroundImage = option.image ? `url("${option.image}")` : 'none';
      preview.dataset.empty = String(!option.image);
      const copy = document.createElement('span');
      copy.className = 'background-choice-copy';
      const name = document.createElement('strong');
      name.textContent = option.name;
      const state = document.createElement('span');
      state.textContent = preferences.background === option.id ? 'Selected' : 'Use background';
      copy.append(name, state);
      const mark = document.createElement('span');
      mark.className = 'background-choice-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = preferences.background === option.id ? '✓' : '';
      button.append(preview, copy, mark);
      button.addEventListener('click', () => {
        preferences.save({ background: option.id });
        updateButtons();
        markSaved();
      });
      gallery.append(button);
    });
  }

  function openGallery() {
    previousFocus = document.activeElement;
    updateButtons();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    page.querySelector('[data-close-backgrounds]').focus();
  }
  function closeGallery() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    previousFocus?.focus();
  }

  updateButtons();
  window.addEventListener('dashboard:appearance-ready', updateButtons);
  page.querySelectorAll('[data-setting] button[data-value]').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.closest('[data-setting]');
      preferences.save({ [group.dataset.setting]: button.dataset.value });
      updateButtons();
      markSaved();
    });
  });
  for (const kind of ['accent','icon']) {
    const field = page.querySelector(`[data-color-field="${kind}"]`);
    const hue = page.querySelector(`[data-color-hue="${kind}"]`);
    const hex = page.querySelector(`[data-color-hex="${kind}"]`);
    hue.addEventListener('input', () => updateColorPreview(kind, { ...pickerState[kind], hue: Number(hue.value) }));
    hue.addEventListener('change', () => saveColor(kind, hsvToHex(pickerState[kind])));
    hex.addEventListener('change', () => { if (/^#[\da-f]{6}$/i.test(hex.value)) saveColor(kind, hex.value); else syncColorPicker(kind); });
    const setFromPointer = event => {
      const rect = field.getBoundingClientRect();
      updateColorPreview(kind, { ...pickerState[kind], saturation: Math.round(Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*100), value: Math.round((1-Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)))*100) });
    };
    field.addEventListener('pointerdown', event => { field.setPointerCapture(event.pointerId); setFromPointer(event); });
    field.addEventListener('pointermove', event => { if (field.hasPointerCapture(event.pointerId)) setFromPointer(event); });
    field.addEventListener('pointerup', () => saveColor(kind, hsvToHex(pickerState[kind])));
    field.addEventListener('keydown', event => {
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 2, state = { ...pickerState[kind] };
      if (event.key === 'ArrowLeft') state.saturation = Math.max(0,state.saturation-step);
      if (event.key === 'ArrowRight') state.saturation = Math.min(100,state.saturation+step);
      if (event.key === 'ArrowUp') state.value = Math.min(100,state.value+step);
      if (event.key === 'ArrowDown') state.value = Math.max(0,state.value-step);
      updateColorPreview(kind,state); saveColor(kind,hsvToHex(state));
    });
  }
  const dimSlider = page.querySelector('[data-background-dim]');
  dimSlider.addEventListener('input', event => {
    const value = Number(event.currentTarget.value);
    preferences.preview({ backgroundDim: value });
    event.currentTarget.style.setProperty('--slider-fill', `${((value - Number(event.currentTarget.min)) / (Number(event.currentTarget.max) - Number(event.currentTarget.min))) * 100}%`);
    page.querySelector('[data-background-dim-value]').value = `${value}%`;
  });
  dimSlider.addEventListener('change', event => {
    preferences.save({ backgroundDim: Number(event.currentTarget.value) }); markSaved();
  });
  const editSidebar = page.querySelector('[data-edit-sidebar]');
  editSidebar.addEventListener('click', () => {
    const editing = preferences.toggleSidebarEditing();
    editSidebar.querySelector('span:last-child').textContent = editing ? 'Done editing' : 'Edit sidebar';
    say(editing ? 'Use the controls in the sidebar to pin or reorder pages.' : 'Sidebar changes saved.');
  });
  page.querySelector('[data-open-backgrounds]').addEventListener('click', openGallery);
  page.querySelector('[data-close-backgrounds]').addEventListener('click', closeGallery);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeGallery(); });
  dialog.addEventListener('close', () => previousFocus?.focus());
  uploadInput.addEventListener('change', async event => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    galleryStatus.textContent = 'Checking image…';
    try {
      await preferences.setBackgroundImage(file);
      galleryStatus.textContent = 'Background saved on this device.';
      updateButtons(); markSaved();
    } catch (error) { galleryStatus.textContent = error.message || 'Could not save that image.'; }
    event.currentTarget.value = '';
  });
  removeUpload.addEventListener('click', async () => {
    try {
      await preferences.removeBackgroundImage();
      galleryStatus.textContent = 'Uploaded background removed.';
      updateButtons(); markSaved();
    } catch { galleryStatus.textContent = 'Could not remove the uploaded image.'; }
  });
  page.querySelector('[data-reset-customization]').addEventListener('click', () => {
    preferences.save({
      density: 'comfortable', accent: 'violet', accentMode: 'auto', customAccent: '#b9a3db',
      iconMode: 'auto', customIconColor: '#e9e7ee', iconSize: 'medium',
      background: 'dead-ahead', backgroundDim: 58, pinnedPages: [], navigationOrder: {}
    });
    updateButtons();
    say('Appearance reset to defaults.');
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.open) closeGallery();
  });
})();
