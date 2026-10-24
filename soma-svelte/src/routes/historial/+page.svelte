<script>
	import { invalidate } from '$app/navigation';
	import Icon from '$lib/Icon.svelte';
	import EventCard from '$lib/EventCard.svelte';
	import { ui } from '$lib/estado.svelte.js';
	import { avisar } from '$lib/toast.svelte.js';
	import { TIPOS, diaAR, etiquetaDia } from '$lib/ui.js';

	let { data } = $props();
	let filtro = $state('todos');
	let periodo = $state('todo');
	let busqueda = $state('');

	const PERIODOS = { todo: 'Todo', 7: '7 días', 30: '30 días', 90: '3 meses' };

	const ordenados = $derived([...data.db.eventos].sort((a, b) => b.fecha.localeCompare(a.fecha)));
	const cuenta = $derived(Object.fromEntries(Object.keys(TIPOS).map((t) => [t, data.db.eventos.filter((e) => e.tipo === t).length])));

	const visibles = $derived(
		ordenados.filter((e) => {
			if (filtro !== 'todos' && e.tipo !== filtro) return false;
			if (periodo !== 'todo' && Date.now() - new Date(e.fecha) > Number(periodo) * 864e5) return false;
			if (busqueda.trim()) {
				const q = busqueda.toLowerCase();
				const texto = [e.titulo, e.resumen, e.texto, ...(e.sintomas ?? []), ...(e.comidas ?? []), e.medico, e.medicamento].join(' ').toLowerCase();
				if (!texto.includes(q)) return false;
			}
			return true;
		})
	);

	const grupos = $derived.by(() => {
		const g = [];
		for (const e of visibles) {
			const k = diaAR(e.fecha);
			if (g.at(-1)?.dia !== k) g.push({ dia: k, eventos: [] });
			g.at(-1).eventos.push(e);
		}
		return g;
	});

	async function borrar(ev) {
		if (!confirm(`¿Borrar “${ev.titulo}”?`)) return;
		await fetch(`/api/eventos/${ev.id}`, { method: 'DELETE' });
		await invalidate('soma:db');
		avisar('Registro borrado');
	}

	async function editar(ev, texto) {
		const res = await fetch(`/api/eventos/${ev.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ texto })
		});
		if (!res.ok) return avisar('No se pudo corregir', 'error');
		await invalidate('soma:db');
		avisar('Registro corregido');
	}
</script>

<svelte:head><title>SOMA · Historial</title></svelte:head>

<div class="pagina">
	<header class="encabezado">
		<div>
			<p class="eyebrow">Tu historia, en orden</p>
			<h1>Historial</h1>
		</div>
		<p class="muted resumen">{data.db.eventos.length} registros · {data.db.estudios.length} estudios</p>
	</header>

	<div class="filtros">
		<div class="chips-scroll">
			<button class="filtro" class:on={filtro === 'todos'} onclick={() => (filtro = 'todos')}>
				Todos <span>{data.db.eventos.length}</span>
			</button>
			{#each Object.entries(TIPOS) as [k, t]}
				<button class="filtro" class:on={filtro === k} style="--c: var(--{k}); --cbg: var(--{k}-bg)" onclick={() => (filtro = filtro === k ? 'todos' : k)}>
					<Icon name={t.icon} size={14} /> {t.corto} <span>{cuenta[k]}</span>
				</button>
			{/each}
		</div>
		<div class="fila2">
			<div class="segmentos" role="group" aria-label="Período">
				{#each Object.entries(PERIODOS) as [k, l]}
					<button class:on={periodo === k} onclick={() => (periodo = k)}>{l}</button>
				{/each}
			</div>
			<label class="buscar">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
				<input bind:value={busqueda} placeholder="Buscar síntoma, comida, médico…" />
			</label>
		</div>
	</div>

	{#if grupos.length === 0}
		<div class="vacio card">
			<Icon name="history" size={28} />
			<p><strong>No hay registros con ese filtro.</strong></p>
			<p class="muted">Probá con otro filtro o contale algo nuevo a SOMA.</p>
		</div>
	{/if}

	<div class="linea">
		{#each grupos as g (g.dia)}
			<section class="dia">
				<h2 class="etiqueta"><span>{etiquetaDia(g.dia)}</span></h2>
				<div class="eventos">
					{#each g.eventos as ev (ev.id)}
						<div class="nodo" style="--c: var(--{ev.tipo})">
							<span class="punto"></span>
							<EventCard {ev} nuevo={ev.id === ui.ultimoId} onborrar={borrar} oneditar={editar} />
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>

<style>
	.pagina { display: grid; gap: 20px; padding-bottom: 24px; }
	.encabezado { display: flex; justify-content: space-between; align-items: end; gap: 12px; flex-wrap: wrap; }
	.resumen { font-size: 14px; }
	.filtros { display: grid; gap: 12px; position: sticky; top: 0; z-index: 5; background: var(--bg); padding: 8px 0; margin: -8px 0; }
	.chips-scroll { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
	.chips-scroll::-webkit-scrollbar { display: none; }
	.filtro {
		--c: var(--ink); --cbg: #eef1f4;
		display: inline-flex; align-items: center; gap: 6px; flex: none;
		height: 36px; padding: 0 14px; border-radius: 999px; font-size: 14px; font-weight: 550;
		background: var(--surface); border: 1px solid var(--line); color: var(--ink-2); transition: all 0.15s;
	}
	.filtro span { font-size: 12px; color: var(--muted); font-weight: 600; }
	.filtro:hover { border-color: #cfd6dd; }
	.filtro.on { background: var(--cbg); border-color: var(--c); color: var(--c); }
	.filtro.on span { color: var(--c); }
	.fila2 { display: flex; gap: 10px; flex-wrap: wrap; }
	.segmentos { display: inline-flex; padding: 3px; border-radius: 12px; background: #eaeef1; }
	.segmentos button { height: 32px; padding: 0 12px; border-radius: 9px; font-size: 13.5px; font-weight: 550; color: var(--muted); }
	.segmentos button.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12); }
	.buscar {
		flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px;
		border-radius: 12px; background: var(--surface); border: 1px solid var(--line); color: var(--muted);
	}
	.buscar input { flex: 1; border: 0; outline: 0; background: none; min-width: 0; font-size: 14px; color: var(--ink); }
	.buscar:focus-within { border-color: var(--brand); }

	.linea { position: relative; display: grid; gap: 22px; }
	.linea::before { content: ''; position: absolute; left: 11px; top: 14px; bottom: 0; width: 2px; background: linear-gradient(var(--line), transparent); }
	.dia { display: grid; gap: 12px; }
	.etiqueta { font-size: 13px; font-weight: 700; color: var(--ink-2); position: relative; padding-left: 36px; }
	.etiqueta::before { content: ''; position: absolute; left: 4px; top: 50%; width: 16px; height: 16px; border-radius: 50%; transform: translateY(-50%); background: var(--bg); border: 2px solid #cfd6dd; }
	.etiqueta span { background: var(--bg); }
	.eventos { display: grid; gap: 10px; }
	.nodo { position: relative; padding-left: 36px; }
	.punto { position: absolute; left: 7px; top: 26px; width: 10px; height: 10px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 4px var(--bg); }
	.vacio { padding: 36px; display: grid; justify-items: center; gap: 6px; text-align: center; color: var(--muted); }
	.vacio strong { color: var(--ink); }

	@media (max-width: 600px) {
		.linea::before { left: 7px; }
		.etiqueta { padding-left: 26px; }
		.etiqueta::before { left: 0; }
		.nodo { padding-left: 24px; }
		.punto { left: 3px; }
		.segmentos { width: 100%; }
		.segmentos button { flex: 1; padding: 0 6px; }
	}
</style>
