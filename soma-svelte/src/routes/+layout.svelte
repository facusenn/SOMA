<script>
	import '../app.css';
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import Icon from '$lib/Icon.svelte';
	import Composer from '$lib/Composer.svelte';
	import { onMount } from 'svelte';
	import { toasts, avisar, avisarError, cerrar } from '$lib/toast.svelte.js';
	import { api } from '$lib/api.js';
	import Instalar from '$lib/Instalar.svelte';
	import { ui } from '$lib/estado.svelte.js';
	import { subirEstudio } from '$lib/dictado.svelte.js';

	let { data, children } = $props();

	let inputArchivo = $state();
	$effect(() => {
		ui.elegirArchivo = () => inputArchivo?.click();
	});

	const nav = [
		{ href: '/', label: 'Registrar', icon: 'mic' },
		{ href: '/historial', label: 'Historial', icon: 'history' },
		{ href: '/estudios', label: 'Estudios', icon: 'flask' },
		{ href: '/problemas', label: 'Posibles problemas', corto: 'Problemas', icon: 'activity' },
		{ href: '/conectar', label: 'Conectá tu agente', corto: 'Agentes', icon: 'plug' }
	];
	const activo = (href) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
	const iniciales = $derived(data.db.paciente.nombre.split(' ').map((p) => p[0]).join('').slice(0, 2));

	async function reiniciar() {
		if (!confirm('¿Volver a los datos de demo? Se borra lo que registraste.')) return;
		try {
			await api('/api/reset', { method: 'POST' });
			await invalidate('soma:db');
			avisar('Se cargaron de nuevo los datos de María.', 'ok', { titulo: 'Demo reiniciada' });
		} catch (e) {
			avisarError(e, 'No se pudo reiniciar');
		}
	}

	onMount(() => {
		const sinRed = () =>
			avisar('Podés seguir mirando tu historia. Para registrar, esperá a que vuelva la conexión.', 'aviso', {
				titulo: 'Sin conexión', id: 'red', duracion: 0
			});
		const conRed = () => avisar('Ya podés registrar de nuevo.', 'ok', { titulo: 'Conexión restablecida', id: 'red' });
		let ultimo = 0;
		const inesperado = (e) => {
			console.error(e);
			if (Date.now() - ultimo < 4000) return;
			ultimo = Date.now();
			avisar('Si se repite, recargá la página.', 'error', { titulo: 'Ocurrió un error inesperado', id: 'inesperado' });
		};
		const rechazo = (e) => inesperado(e.reason);
		if (!navigator.onLine) sinRed();
		addEventListener('offline', sinRed);
		addEventListener('online', conRed);
		addEventListener('error', inesperado);
		addEventListener('unhandledrejection', rechazo);
		return () => {
			removeEventListener('offline', sinRed);
			removeEventListener('online', conRed);
			removeEventListener('error', inesperado);
			removeEventListener('unhandledrejection', rechazo);
		};
	});

	const ICONO_TOAST = { ok: 'check', info: 'info', aviso: 'alert', error: 'alert' };
</script>

<div class="app">
	<aside class="lateral">
		<a href="/" class="logo">
			<img src="/favicon.svg" alt="" width="34" height="34" />
			<span>SOMA</span>
		</a>

		<div class="paciente">
			<span class="avatar">{iniciales}</span>
			<div>
				<strong>{data.db.paciente.nombre}</strong>
				<span class="muted">{data.db.paciente.edad} años</span>
			</div>
		</div>

		<nav>
			{#each nav as n}
				<a href={n.href} class:activo={activo(n.href)}>
					<Icon name={n.icon} size={19} />
					{n.label}
				</a>
			{/each}
		</nav>

		<div class="pie">
			<span class="modo" class:ia={data.conIA}>
				<span class="led"></span>
				{data.conIA ? 'IA conectada' : 'Modo demo (sin IA)'}
			</span>
			<Instalar />
			<button class="link" onclick={reiniciar}><Icon name="refresh" size={14} /> Reiniciar demo</button>
			<p class="legal">SOMA no diagnostica ni receta. Ordena tu información para hablarla con tu médico.</p>
		</div>
	</aside>

	<header class="superior">
		<a href="/" class="logo"><img src="/favicon.svg" alt="" width="28" height="28" /><span>SOMA</span></a>
		<div class="derecha">
			<Instalar compacto />
			<span class="avatar chico">{iniciales}</span>
		</div>
	</header>

	<main>
		<div class="contenido">
			{@render children()}
		</div>
		{#if page.url.pathname !== '/'}
			<div class="composer">
				<Composer />
			</div>
		{/if}
	</main>

	<nav class="pestanas">
		{#each nav as n}
			<a href={n.href} class:activo={activo(n.href)}>
				<Icon name={n.icon} size={21} />
				<span>{n.corto ?? n.label}</span>
			</a>
		{/each}
	</nav>
</div>

<input
	type="file"
	accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
	hidden
	bind:this={inputArchivo}
	onchange={async (e) => {
		const input = e.currentTarget; // después del await currentTarget ya es null
		await subirEstudio(input.files[0]);
		input.value = '';
	}}
/>

<div class="toasts" aria-live="polite">
	{#if ui.subida}
		{@const leyendo = ui.subida.progreso >= 1}
		<div class="toast subida" role="status">
			<span class="t-ico spin"><Icon name={leyendo ? 'sparkles' : 'refresh'} size={16} /></span>
			<div class="t-txt">
				<strong>{leyendo ? 'Leyendo el estudio con IA…' : `Subiendo estudio… ${Math.round(ui.subida.progreso * 100)}%`}</strong>
				<span class="nombre">{ui.subida.nombre}</span>
				<span class="muted">{leyendo ? 'Puede tardar hasta un minuto. Podés seguir usando la app.' : 'No cierres la página hasta que termine.'}</span>
			</div>
			<span class="progreso" class:indeterminado={leyendo}><span style="width:{Math.round(ui.subida.progreso * 100)}%"></span></span>
		</div>
	{/if}
	{#each toasts as t (t.id)}
		<div class="toast {t.tipo}" role={t.tipo === 'error' ? 'alert' : 'status'}>
			<span class="t-ico"><Icon name={t.id === 'red' && t.tipo === 'aviso' ? 'wifioff' : ICONO_TOAST[t.tipo] ?? 'info'} size={16} /></span>
			<div class="t-txt">
				{#if t.titulo}<strong>{t.titulo}</strong>{/if}
				<span>{t.texto}</span>
			</div>
			<button class="t-x" onclick={() => cerrar(t.id)} aria-label="Cerrar aviso"><Icon name="x" size={14} /></button>
			{#if t.duracion}<span class="t-barra" style="animation-duration:{t.duracion}ms"></span>{/if}
		</div>
	{/each}
</div>

<style>
	.app { display: grid; grid-template-columns: 268px 1fr; min-height: 100dvh; }
	.lateral {
		position: sticky; top: 0; height: 100dvh; display: flex; flex-direction: column; gap: 24px;
		padding: 24px 18px; background: var(--surface); border-right: 1px solid var(--line);
	}
	.logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 21px; letter-spacing: 0.08em; }
	.paciente { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--line); }
	.paciente div { display: grid; line-height: 1.3; font-size: 14px; }
	.paciente .muted { font-size: 13px; }
	.avatar {
		width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
		background: linear-gradient(135deg, #fde68a, #fca5a5); color: #7c2d12; font-weight: 700; font-size: 14px;
	}
	.avatar.chico { width: 34px; height: 34px; font-size: 12px; }
	nav { display: grid; gap: 4px; }
	.lateral nav a {
		display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px;
		font-weight: 500; color: var(--ink-2); transition: background 0.15s;
	}
	.lateral nav a:hover { background: var(--surface-2); }
	.lateral nav a.activo { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
	.pie { margin-top: auto; display: grid; gap: 10px; }
	.modo { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #b45309; }
	.modo.ia { color: #047857; }
	.led { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 20%, transparent); }
	.link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); justify-self: start; }
	.link:hover { color: var(--ink); }
	.legal { font-size: 12px; color: var(--muted); line-height: 1.45; }

	main { min-width: 0; display: flex; flex-direction: column; }
	.contenido { flex: 1; width: 100%; max-width: 940px; margin: 0 auto; padding: 36px 32px 24px; }
	.composer {
		position: sticky; bottom: 0; z-index: 10; width: 100%; max-width: 940px; margin: 0 auto; padding: 12px 32px 18px;
		background: linear-gradient(to top, var(--bg) 70%, transparent);
	}

	.superior, .pestanas { display: none; }

	.toasts {
		position: fixed; top: 20px; right: 20px; z-index: 100; display: grid; gap: 10px;
		width: min(380px, calc(100vw - 32px));
	}
	.toast {
		--c: #059669; --cbg: #e8f8f1;
		position: relative; overflow: hidden; display: flex; gap: 12px; align-items: flex-start;
		padding: 12px 12px 14px 14px; border-radius: 14px; background: var(--surface);
		border: 1px solid var(--line); box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
		animation: entra 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2);
	}
	.toast.info { --c: #2563eb; --cbg: #eef4ff; }
	.toast.aviso { --c: #d97706; --cbg: #fff6e6; }
	.toast.error { --c: #dc2626; --cbg: #fdeeee; }
	.toast::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--c); }
	@keyframes entra { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: none; } }
	.t-ico { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex: none; background: var(--cbg); color: var(--c); }
	.t-txt { flex: 1; min-width: 0; display: grid; gap: 1px; font-size: 13.5px; line-height: 1.4; color: var(--ink-2); padding-top: 4px; }
	.t-txt strong { font-size: 14px; color: var(--ink); }
	.t-x { padding: 5px; border-radius: 8px; color: var(--muted); flex: none; }
	.t-x:hover { background: var(--surface-2); color: var(--ink); }
	.t-barra { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: var(--c); opacity: 0.35; transform-origin: left; animation: consume linear forwards; }
	@keyframes consume { from { transform: scaleX(1); } to { transform: scaleX(0); } }
	.derecha { display: flex; align-items: center; gap: 10px; }

	.toast.subida { --c: var(--brand); --cbg: var(--brand-soft); padding-bottom: 16px; }
	.toast.subida .nombre { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-2); }
	.progreso { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: var(--brand-soft); overflow: hidden; }
	.progreso span { display: block; height: 100%; background: var(--brand); transition: width 0.2s ease-out; }
	.progreso.indeterminado span { width: 35% !important; animation: vaiven 1.2s ease-in-out infinite; }
	@keyframes vaiven { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

	@media (max-width: 900px) {
		.app { grid-template-columns: 1fr; }
		.lateral { display: none; }
		.superior {
			display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20;
			padding: 12px 16px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line);
		}
		.superior .logo { font-size: 18px; }
		.contenido { padding: 20px 16px 12px; }
		.composer { padding: 8px 12px 10px; bottom: 64px; }
		.pestanas {
			display: grid; grid-template-columns: repeat(5, 1fr); position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
			background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border-top: 1px solid var(--line);
			padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
		}
		.pestanas a { display: grid; justify-items: center; gap: 2px; font-size: 11px; font-weight: 500; color: var(--muted); padding: 4px 0; }
		.pestanas a.activo { color: var(--brand); font-weight: 600; }
		main { padding-bottom: 64px; }
		.toasts { top: 70px; left: 16px; right: 16px; width: auto; }
	}
</style>
