const tabBar = document.querySelector('.tab-bar');
let tabs = [];

function renderTabs(labels) {
  tabBar.replaceChildren(...labels.map((label, index) => {
    const tab = document.createElement('button');
    tab.className = `tab${index === 0 ? ' active' : ''}`;
    tab.dataset.index = index;
    tab.type = 'button';
    tab.textContent = label;
    tab.addEventListener('click', () => window.kiosk.selectTab(index));
    return tab;
  }));
  tabs = [...tabBar.querySelectorAll('.tab')];
}

function setActiveTab(index) {
  tabs.forEach((tab, tabIndex) => tab.classList.toggle('active', tabIndex === index));
}

window.kiosk.getTabs().then(renderTabs);
window.kiosk.onActiveTabChanged(setActiveTab);
