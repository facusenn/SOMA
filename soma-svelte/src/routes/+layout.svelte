<script>
	import '../app.css';
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import Icon from '$lib/Icon.svelte';
	import Composer from '$lib/Composer.svelte';
	import { toasts, avisar } from '$lib/toast.svelte.js';
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
		await fetch('/api/reset', { method: 'POST' });
		await invalidate('soma:db');
		avisar('Demo reiniciada');
	}
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
			<button class="link" onclick={reiniciar}><Icon name="refresh" size={14} /> Reiniciar demo</button>
			<p class="legal">SOMA no diagnostica ni receta. Ordena tu información para hablarla con tu médico.</p>
		</div>
	</aside>

	<header class="superior">
		<a href="/" class="logo"><img src="/favicon.svg" alt="" width="28" height="28" /><span>SOMA</span></a>
		<span class="avatar chico">{iniciales}</span>
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
	accept="application/pdf,image/*"
	hidden
	bind:this={inputArchivo}
	onchange={async (e) => {
		await subirEstudio(e.currentTarget.files[0]);
		e.currentTarget.value = '';
	}}
/>

<div class="toasts" aria-live="polite">
	{#each toasts as t (t.id)}
		<div class="toast" class:error={t.tipo === 'error'}>
			<Icon name={t.tipo === 'error' ? 'alert' : 'check'} size={16} />
			{t.texto}
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

	.toasts { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); display: grid; gap: 8px; z-index: 100; }
	.toast {
		display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
		background: var(--ink); color: white; font-size: 14px; font-weight: 500; box-shadow: var(--shadow-lg);
		animation: rise 0.2s ease-out;
	}
	.toast.error { background: #b91c1c; }

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
	}
</style>
