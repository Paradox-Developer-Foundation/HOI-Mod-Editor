// 统一设置主题：更新 DOM、可选持久化并通知后端（Tauri）以应用窗口级别样式
async function setAppTheme(dark, persist = false) {
    const html = document.documentElement;
    html.dataset.theme = dark ? 'dark' : 'light';
    if (persist) {
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch(e){}
    }

    // 尝试通知 Tauri 后端设置系统窗口主题（如果可用）
    try {
        const tauri = await import('@tauri-apps/api/tauri');
        if (tauri && typeof tauri.invoke === 'function') {
            await tauri.invoke('set_theme', { dark });
        }
    } catch (e) {
        try {
            if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
                await window.__TAURI__.invoke('set_theme', { dark });
            }
        } catch(e2) { /* ignore */ }
    }
}

// 启动时应用已保存的主题或系统偏好
(function initTheme(){
    try{
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') {
            // 使用保存的主题
            setAppTheme(saved === 'dark', false);
        } else if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            setAppTheme(mq.matches, false);
            // 当系统主题发生变化且用户未手动设置时，自动同步
            mq.addEventListener ? mq.addEventListener('change', e => {
                const userSet = !!localStorage.getItem('theme');
                if (!userSet) setAppTheme(e.matches, false);
            }) : mq.addListener(e => {
                const userSet = !!localStorage.getItem('theme');
                if (!userSet) setAppTheme(e.matches, false);
            });
        }
    }catch(e){ /* ignore */ }
})();

const mainContent = document.getElementById('main-content');
const settingsLink = document.getElementById('open-settings');
const modsLink = document.getElementById('open-mods');
const homeLink = document.getElementById('open-home');

// 保存初始主内容，返回时恢复
const initialMainHTML = mainContent ? mainContent.innerHTML : '';

if (settingsLink) settingsLink.addEventListener('click', e => { e.preventDefault(); loadPageSPA('settings'); });
if (modsLink) modsLink.addEventListener('click', e => { e.preventDefault(); loadPageSPA('mods'); });
if (homeLink) homeLink.addEventListener('click', e => { e.preventDefault(); restoreHome(); });

// 页面加载时根据 hash 自动打开对应页面（例如 index.html#settings 或 index.html#mods）
window.addEventListener('DOMContentLoaded', () => {
    try{
        const h = location.hash || '';
        if (h.includes('settings')) loadPageSPA('settings');
        else if (h.includes('mods')) loadPageSPA('mods');
    }catch(e){ /* ignore */ }
});

async function loadPageSPA(name) {
    const pagePath = `pages/${name}.html`;
    try {
        const res = await fetch(pagePath);
        const text = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // 找到页面 CSS（如果存在）并注入到 head（带 id 便于移除）
        const linkEl = doc.querySelector('link[rel="stylesheet"]');
        if (linkEl) {
            const existing = document.getElementById('page-css');
            if (existing) existing.remove();

            const newLink = document.createElement('link');
            newLink.id = 'page-css';
            newLink.rel = 'stylesheet';
            // 规范化路径：先去除 ./ 或 ../ 前缀
            let href = linkEl.getAttribute('href') || '';
            href = href.replace(/^\.{1,2}\//, '');
            // 如果不是以 css/ 或 pages/ 开始，则相对于 pages/ 目录
            if (!href.startsWith('css/') && !href.startsWith('pages/')) href = `pages/${href}`;
            newLink.href = href;
            document.head.appendChild(newLink);
        }

        // 找到页面脚本并注入（如果存在）
        const scriptEl = doc.querySelector('script[src]');
        if (scriptEl) {
            const existingJs = document.getElementById('page-js');
            if (existingJs) existingJs.remove();

            const newScript = document.createElement('script');
            newScript.id = 'page-js';
            newScript.defer = false;
            let src = scriptEl.getAttribute('src') || '';
            src = src.replace(/^\.{1,2}\//, '');
            if (!src.startsWith('javascript/') && !src.startsWith('pages/')) src = `pages/${src}`;
            newScript.src = src;
            document.body.appendChild(newScript);
        }

        const container = doc.querySelector('.settings-container') || doc.querySelector('.mods-container');
        if (container) {
            // 设置 hash，方便独立打开时跳回
            location.hash = name;

            mainContent.innerHTML = container.outerHTML + '\n<!-- SPA: injected ' + name + ' -->';

            setupBindingsFor(name);
        } else {
            console.warn('未在页面中找到预期的容器:', pagePath);
        }
    } catch (err) {
        console.error('加载页面失败:', pagePath, err);
    }
}

function restoreHome(){
    // 移除注入的样式与脚本
    const injectedCss = document.getElementById('page-css');
    if (injectedCss) injectedCss.remove();
    const injectedJs = document.getElementById('page-js');
    if (injectedJs) injectedJs.remove();

    // 恢复主内容
    mainContent.innerHTML = initialMainHTML;
    try { history.replaceState(null, '', location.pathname); } catch(e) {}
}

function setupBindingsFor(name) {
    // 绑定通用返回链接：已移除页面内返回按钮，使用侧边栏主页按钮

    if (name === 'settings') {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.addEventListener('click', async () => {
            const html = document.documentElement;
            const newTheme = html.dataset.theme === 'light' ? 'dark' : 'light';
            // 持久化用户选择
            await setAppTheme(newTheme === 'dark', true);
        });

        const checkUpdate = document.getElementById('check-update');
        if (checkUpdate) checkUpdate.addEventListener('click', () => {
            alert('这里可以调用 Tauri 后端检查更新逻辑');
        });
    }

    if (name === 'mods') {
        // 如果需要，可以在此处绑定模组页面的交互
        const items = document.querySelectorAll('.mod-item');
        items.forEach(it => it.addEventListener('click', () => {
            alert('打开模组：' + it.dataset.name);
        }));
    }
}
