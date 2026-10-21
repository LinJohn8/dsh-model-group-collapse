/**
 * dsh-model-group-collapse — Client half.
 *
 * Enhances the shipped composer model menu (the provider-grouped model list)
 * with collapsible provider groups. It does NOT replace any component: the
 * shipped ModelSelect keeps rendering, and this module decorates the menu it
 * portals into the document.
 *
 * The shipped menu structure (the model picker's ARIA/DOM contract):
 *   section[data-menu-group]              <- one provider group
 *     div[data-menu-group-heading]        <- provider name (the heading)
 *     button[role="menuitemradio"] ...    <- that provider's model rows
 *
 * Behavior:
 *   - every provider heading becomes a toggle with a triangle caret
 *     (▸ collapsed / ▾ expanded);
 *   - all groups start collapsed, except the provider of the current model;
 *   - clicking a heading toggles that group;
 *   - while the menu's search box has a query, matched groups render expanded.
 */
window.__ModuleLoader__.load({
	id: "dsh-model-group-collapse",
	factory: () => {
		const GROUP_SELECTOR = "section[data-menu-group]";
		const HEADING_SELECTOR = "[data-menu-group-heading]";
		const ROW_SELECTOR = 'button[role="menuitemradio"]';
		const SEARCH_SELECTOR = 'input[role="searchbox"]';
		const TRI_CLASS = "mgc-tri";

		const CSS = [
			"[data-menu-group-heading][data-mgc-toggle]{cursor:pointer;user-select:none}",
			"[data-menu-group-heading][data-mgc-toggle]:hover{color:var(--dsw-alias-label-secondary)}",
			".mgc-tri{display:inline-block;width:10px;margin-right:5px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);pointer-events:none}",
		].join("\n");

		const styleTagId = "dsh-model-group-collapse/menu.css";

		function ensureStyle() {
			if (typeof document === "undefined") return;
			if (document.querySelector('style[data-plugin-css="' + styleTagId + '"]') !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-model-group-collapse";
			tag.dataset.pluginCss = styleTagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// ------------------------------------------------------------------
		// menu discovery
		// ------------------------------------------------------------------

		/** Every provider-group element in any open model menu. */
		function collectGroups() {
			const groups = [];
			for (const group of document.querySelectorAll(GROUP_SELECTOR)) {
				if (group.parentElement !== null) groups.push(group);
			}
			return groups;
		}

		function groupsOf(container) {
			return [...container.querySelectorAll(":scope > " + GROUP_SELECTOR)];
		}

		function headingOf(group) {
			return group.querySelector(":scope > " + HEADING_SELECTOR);
		}

		function rowsOf(group) {
			return [...group.querySelectorAll(":scope > " + ROW_SELECTOR)];
		}

		/** The menu's search box lives beside the group viewport, in the surface. */
		function searchBoxOf(container) {
			const surface = container.parentElement;
			if (surface === null) return null;
			return surface.querySelector(SEARCH_SELECTOR);
		}

		function isSearching(container) {
			const input = searchBoxOf(container);
			return input !== null && input.value.trim() !== "";
		}

		// ------------------------------------------------------------------
		// group decoration
		// ------------------------------------------------------------------

		function triangleOf(heading) {
			let triangle = heading.querySelector(":scope > ." + TRI_CLASS);
			if (triangle === null) {
				triangle = document.createElement("span");
				triangle.className = TRI_CLASS;
				triangle.setAttribute("aria-hidden", "true");
				heading.prepend(triangle);
			}
			return triangle;
		}

		/**
		 * Paint one group's collapsed/expanded state.
		 *
		 * Every write here is guarded by an equality check: a text-node rewrite
		 * is a childList mutation, and the container observer below would
		 * otherwise feed its own repaint back into an endless loop (the menu
		 * freezes). Style and attribute writes are not observed at all.
		 */
		function paint(group) {
			const heading = headingOf(group);
			if (heading === null) return;
			const rows = rowsOf(group);
			if (rows.length === 0) return;
			const container = group.parentElement;
			const searching = container !== null && isSearching(container);
			const collapsed = group.dataset.mgcCollapsed === "1";
			const hidden = collapsed && !searching;
			const display = hidden ? "none" : "";
			for (const row of rows) {
				if (row.style.display !== display) row.style.display = display;
			}
			const expanded = String(!hidden);
			if (heading.getAttribute("aria-expanded") !== expanded) heading.setAttribute("aria-expanded", expanded);
			const glyph = hidden ? "▸" : "▾";
			const triangle = triangleOf(heading);
			if (triangle.textContent !== glyph) triangle.textContent = glyph;
		}

		function toggle(group) {
			group.dataset.mgcCollapsed = group.dataset.mgcCollapsed === "1" ? "0" : "1";
			paint(group);
		}

		function initGroup(group) {
			const heading = headingOf(group);
			if (heading === null) return;
			const rows = rowsOf(group);
			if (rows.length === 0) return;
			if (heading.dataset.mgcToggle !== "1") {
				heading.dataset.mgcToggle = "1";
				const current = rows.some((row) => row.getAttribute("aria-checked") === "true");
				group.dataset.mgcCollapsed = current ? "0" : "1";
				heading.setAttribute("role", "button");
				heading.setAttribute("tabindex", "0");
				// keep focus (and the open menu) where it is while toggling
				heading.addEventListener("mousedown", (event) => event.preventDefault());
				heading.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					toggle(group);
				});
				heading.addEventListener("keydown", (event) => {
					if (event.key !== "Enter" && event.key !== " ") return;
					event.preventDefault();
					toggle(group);
				});
			}
			paint(group);
		}

		// ------------------------------------------------------------------
		// wiring
		// ------------------------------------------------------------------

		/**
		 * Watch one group container for React re-renders (search filtering
		 * recreates the rows) and for search input changes.
		 * @returns cleanup for the container-scoped observers and listeners.
		 */
		function wire(container) {
			let painting = false;
			const repaint = () => {
				// re-entrancy guard: our own repaint must never re-enter here
				if (painting) return;
				painting = true;
				try {
					for (const group of groupsOf(container)) initGroup(group);
				} finally {
					painting = false;
				}
			};
			const observer = new MutationObserver(repaint);
			observer.observe(container, { childList: true, subtree: true });
			const disposers = [() => observer.disconnect()];
			const input = searchBoxOf(container);
			if (input !== null) {
				const onSearch = () => repaint();
				for (const eventName of ["input", "change", "search"]) {
					input.addEventListener(eventName, onSearch);
					disposers.push(() => input.removeEventListener(eventName, onSearch));
				}
			}
			return () => {
				for (const dispose of disposers) dispose();
			};
		}

		function apply(ctx) {
			ensureStyle();
			// drop the diagnostic pill a previous build may have left behind
			const stale = typeof document !== "undefined" ? document.getElementById("mgc-selfcheck") : null;
			if (stale !== null) stale.remove();
			ctx.effect(() => {
				const wired = new Map();
				let scanning = false;
				const scan = () => {
					if (scanning) return;
					scanning = true;
					try {
						// drop containers whose menu closed
						for (const [container, cleanup] of [...wired]) {
							if (!container.isConnected) {
								cleanup();
								wired.delete(container);
							}
						}
						for (const group of collectGroups()) {
							const container = group.parentElement;
							if (container !== null && !wired.has(container)) wired.set(container, wire(container));
							initGroup(group);
						}
					} finally {
						scanning = false;
					}
				};
				let scheduled = false;
				const scheduleScan = () => {
					if (scheduled) return;
					scheduled = true;
					setTimeout(() => {
						scheduled = false;
						scan();
					}, 40);
				};
				// the menu portals straight into <body>; inner re-renders are
				// watched per container, so this body observer stays cheap
				const bodyObserver = new MutationObserver(scheduleScan);
				bodyObserver.observe(document.body, { childList: true });
				// opening the menu is a click (or Enter on the trigger): re-scan
				// after the portal has been committed, whatever the open path
				document.addEventListener("click", scheduleScan, true);
				document.addEventListener("keydown", scheduleScan, true);
				scan();
				return () => {
					bodyObserver.disconnect();
					document.removeEventListener("click", scheduleScan, true);
					document.removeEventListener("keydown", scheduleScan, true);
					for (const cleanup of wired.values()) cleanup();
					wired.clear();
				};
			}, "model-group-collapse: menu decoration");
		}

		return { inject: [], apply };
	},
});
