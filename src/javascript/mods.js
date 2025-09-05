// 尝试通过 Tauri 后端读取模组列表并渲染为卡片
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderMods();
});

async function fetchAndRenderMods(){
    let mods = [];
    try{
        // 选择合适的 invoke 方法
        const invokeVariants = [];
        try{
            const tauri = await import('@tauri-apps/api/tauri');
            if (tauri && typeof tauri.invoke === 'function') invokeVariants.push(async (cmd) => tauri.invoke(cmd));
        }catch(e){ /* ignore import error */ }

        if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
            invokeVariants.push(async (cmd) => window.__TAURI__.invoke(cmd));
            // some environments expect object: {cmd: 'name'}
            invokeVariants.push(async (cmd) => window.__TAURI__.invoke({ cmd }));
        }
        if (typeof window.invoke === 'function') invokeVariants.push(async (cmd) => window.invoke(cmd));

        let success = false;
        for (const inv of invokeVariants) {
            try {
                const result = await inv('list_mods');
                // ���果 result 看起来像数组，则使用
                if (Array.isArray(result)) {
                    mods = result;
                    success = true;
                    break;
                }
                // 有些环境会把结果包在 { payload: ... } 或 JSON 字符串里，尝试解析
                if (result && typeof result === 'object') {
                    // 如果有 data 或 payload 字段
                    if (Array.isArray(result.payload)) { mods = result.payload; success = true; break; }
                    if (Array.isArray(result.data)) { mods = result.data; success = true; break; }
                }
                if (typeof result === 'string') {
                    try { const parsed = JSON.parse(result); if (Array.isArray(parsed)) { mods = parsed; success = true; break; } } catch(e){}
                }
            } catch(e) {
                // 尝试下一个调用方式
                console.warn('invoke variant failed:', e);
            }
        }

        if (!success) {
            console.warn('无法通过后端获取模组列表，使用占位数据');
            mods = [
                { name: '示例模组 A', path: '', file: 'example_a.mod' },
                { name: '示例模组 B', path: '', file: 'example_b.mod' }
            ];
        }
    }catch(err){
        console.error('读取模组失败', err);
        mods = [ { name: '示例模组（读取失败）', path:'', file: 'none' } ];
    }

    renderMods(mods);
}

function renderMods(mods){
    const list = document.querySelector('.mods-list');
    if (!list) return;
    list.innerHTML = '';

    if (!mods || mods.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'surface';
        empty.style.padding = '1rem';
        empty.textContent = '未在文档目录中找到��何模组（请确保存在 %USERPROFILE%\\Documents\\Paradox Interactive\\Hearts of Iron IV\\mod 下的 .mod 文件）';
        list.appendChild(empty);
        return;
    }

    mods.forEach(m => {
        const card = document.createElement('div');
        card.className = 'mod-item surface';
        card.dataset.name = m.name || m.file || '未知模组';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                <div>
                    <div class="mod-title">${escapeHtml(m.name || m.file)}</div>
                    <div class="mod-desc">路径: ${escapeHtml(m.path || m.file)}</div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-ghost open-btn">打开</button>
                    <button class="btn" data-name="${escapeHtml(m.name)}">详情</button>
                </div>
            </div>
        `;

        // 点击卡片本身或打开按钮执行打开操作
        const openBtn = card.querySelector('.open-btn');
        if (openBtn) openBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            alert('打开模组：' + (card.dataset.name || '未知'));
        });
        const detailBtn = card.querySelector('.btn:not(.btn-ghost)');
        if (detailBtn) detailBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            showModDetail(card.dataset.name);
        });

        card.addEventListener('click', () => showModDetail(card.dataset.name));

        list.appendChild(card);
    });
}

function escapeHtml(str){
    if (!str) return '';
    return String(str).replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function showModDetail(name){
    const overlay = document.createElement('div');
    overlay.className = 'mod-detail-overlay';
    overlay.innerHTML = `
        <div class="mod-detail surface" role="dialog" aria-label="模组详情">
            <h2 class="page-title">${escapeHtml(name)}</h2>
            <p class="mod-desc">这里是模组 ${escapeHtml(name)} 的详细信息占位符。</p>
            <div style="margin-top:1rem; display:flex; gap:0.5rem;">
                <button class="btn" id="open-mod-btn">打开模组</button>
                <button class="btn btn-ghost" id="close-mod-btn">关闭</button>
            </div>
        </div>
    `;

    Object.assign(overlay.style, {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)', zIndex: 9999, animation: 'fadeIn var(--motion-medium) both'
    });

    document.body.appendChild(overlay);

    overlay.querySelector('#close-mod-btn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#open-mod-btn').addEventListener('click', () => { alert('执行打开模组逻辑：' + name); overlay.remove(); });
}

// 导出以便在其他模块被调用（不破坏全局）
window.__hoi_mods = { fetchAndRenderMods, showModDetail };
