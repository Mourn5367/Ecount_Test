/* 설치 안내와 오프라인 준비 상태. 데이터 저장은 기존 HTML에서 처리합니다. */
(() => {
  const status = document.getElementById('connection-status');
  const banner = document.getElementById('app-status');
  const installButton = document.getElementById('install-app');
  const installStatus = document.getElementById('install-status');
  const help = document.getElementById('install-help');
  const updateButton = document.getElementById('app-update');
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt, registration, offlineReady = false, updateRequested = false;
  let unavailable = '';

  function refreshStatus() {
    banner.dataset.offline = String(!navigator.onLine);
    status.textContent = unavailable || (offlineReady
      ? (navigator.onLine ? '이 기기에 저장 · 오프라인 사용 준비 완료' : '오프라인 · 이 기기에 계속 저장됩니다')
      : (navigator.onLine ? '이 기기에 저장 · 오프라인 사용 준비 중…' : '오프라인 · 인터넷 연결 후 앱을 준비하세요'));
  }
  function refreshInstall() {
    const installed = standalone.matches || navigator.standalone === true;
    installButton.classList.toggle('hide', installed);
    installStatus.textContent = installed ? '홈 화면 앱으로 사용 중입니다.' : '홈 화면에 추가하면 앱처럼 바로 열 수 있습니다.';
  }
  window.addEventListener('online', refreshStatus);
  window.addEventListener('offline', refreshStatus);
  standalone.addEventListener('change', refreshInstall);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.textContent = '앱 설치';
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.classList.add('hide');
    installStatus.textContent = '설치되었습니다. 홈 화면에서 자재 입력 앱을 열어 주세요.';
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) {
      help.open = true;
      help.scrollIntoView({ block: 'nearest' });
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      installStatus.textContent = result.outcome === 'accepted'
        ? '홈 화면에서 자재 입력 앱을 열어 주세요.'
        : '나중에 다시 설치할 수 있습니다. 설치 방법을 확인하세요.';
    } catch (error) { help.open = true; }
    installButton.textContent = '홈 화면에 추가';
  });
  refreshInstall();
  refreshStatus();

  if (!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol === 'file:') {
    unavailable = '홈 화면 설치·오프라인 실행은 GitHub Pages 주소에서 지원됩니다.';
    refreshStatus();
    return;
  }
  const showUpdate = () => {
    if (registration.waiting && navigator.serviceWorker.controller) updateButton.classList.remove('hide');
  };
  updateButton.addEventListener('click', () => {
    if (!registration || !registration.waiting) return;
    if (!confirm('앱을 업데이트하고 다시 엽니다. 입력 중인 품목은 먼저 추가해 주세요. 계속할까요?')) return;
    updateRequested = true;
    updateButton.disabled = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateRequested) location.reload();
  });
  navigator.serviceWorker.register('./ecount-sw.js', { scope: './', updateViaCache: 'none' })
    .then(async reg => {
      registration = reg;
      showUpdate();
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (worker) worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') showUpdate();
        });
      });
      await navigator.serviceWorker.ready;
      offlineReady = true;
      refreshStatus();
    })
    .catch(error => {
      unavailable = '오프라인 준비 실패 · 인터넷 연결 후 다시 열어 주세요.';
      refreshStatus();
      console.warn('오프라인 앱 준비 실패:', error);
    });
})();
