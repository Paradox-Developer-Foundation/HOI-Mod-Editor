// 在加载时应用已保存的主题（如果存在）
(function applySavedTheme(){
    try{
        const saved = localStorage.getItem('theme');
        if(saved) document.documentElement.dataset.theme = saved;
    }catch(e){ /* ignore */ }
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    const newTheme = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = newTheme;
    try{ localStorage.setItem('theme', newTheme); }catch(e){ /* ignore */ }
});

document.getElementById('check-update').addEventListener('click', () => {
    alert('这里可以调用 Tauri 后端检查更新逻辑');
});
