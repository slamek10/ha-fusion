<script lang="ts">
  import {
    editMode,
    motion,
    record,
    dragging,
    itemHeight,
    states,
    dashboard,
  } from "$lib/Stores";
  import { onMount, tick } from "svelte";
  import {
    onDndReceive,
    sortable,
    type DndReceiveDetail,
  } from "$lib/Actions/sortable";
  import Content from "$lib/Main/Content.svelte";
  import SectionHeader from "$lib/Main/SectionHeader.svelte";
  import HorizontalStackHeader from "$lib/Main/HorizontalStackHeader.svelte";
  import VerticalStackHeader from "$lib/Main/VerticalStackHeader.svelte";
  import Scenes from "$lib/Main/Scenes.svelte";
  import Bills from "$lib/Main/Bills.svelte";
  import { handleVisibility, mediaQueries } from "$lib/Conditional";
  import { generateId } from "$lib/Utils";
  import { transferLegacyItem, transferLegacySection } from "./legacyDrag";
  import {
    buttonTemplateStore,
    isItemSquare,
    isItemMedium,
    computeGridPositions,
  } from "$lib/Stores/buttonTemplates";

  let { view, altKeyPressed }: { view: any; altKeyPressed: boolean } = $props();

  const stackHeight = $itemHeight * 1.65;

  let mounted = $state(false);
  onMount(() => (mounted = true));

  function handleDragStart() {
    $dragging = true;
    document.body.style.height = `${parseFloat(getComputedStyle(document.body).height) + 1}px`;
  }

  async function handleDragEnd(changed = true) {
    // `view` is a plain prop object, so sortable's mutations don't notify the
    // $dashboard store and keyed each blocks keep stale refs - the UI would
    // render the pre-drag order while the data already changed. Deep clone to
    // refresh all refs, same as undo/redo does when restoring history.
    if (changed) {
      dashboard.update((d) => JSON.parse(JSON.stringify(d)));
      $record();
    }
    $dragging = false;
    await tick();
    document.body.style.height = "auto";
  }

  // every descendant needs a fresh id too: a duplicated id would make later
  // transfers resolve the wrong section's entry
  function cloneEntry(entry: any) {
    const copy = structuredClone(entry);
    const regenerateIds = (value: any) => {
      value.id = generateId($dashboard);
      for (const item of value.items ?? []) regenerateIds(item);
      for (const section of value.sections ?? []) regenerateIds(section);
    };
    regenerateIds(copy);
    return copy;
  }

  async function receiveSection(
    targetParentId: string | null,
    detail: DndReceiveDetail,
  ) {
    const changed = transferLegacySection(
      view.sections,
      targetParentId,
      detail.id,
      detail.newIndex,
      altKeyPressed ? cloneEntry : undefined,
    );
    await handleDragEnd(changed);
  }

  async function receiveItem(
    targetSectionId: string,
    detail: DndReceiveDetail,
  ) {
    const changed = transferLegacyItem(
      view.sections,
      targetSectionId,
      detail.id,
      detail.newIndex,
      altKeyPressed ? cloneEntry : undefined,
    );
    await handleDragEnd(changed);
  }

  function maybeCloneItem(
    items: any[],
    oldIndex: number,
    newIndex: number,
  ): any[] {
    if (altKeyPressed) {
      const cloned = { ...items[oldIndex], id: generateId($dashboard) };
      const result = [...items];
      result.splice(newIndex, 0, cloned);
      return result;
    }
    return items;
  }

  function sectionGroupPut(_to: any, _from: any, dragEl: HTMLElement): boolean {
    const dragType = dragEl.dataset.sectionType;
    if (
      dragType === "horizontal-stack" ||
      dragType === "vertical-stack" ||
      dragType === "scenes" ||
      dragType === "bills"
    ) {
      return false;
    }
    return true;
  }

  function sectionStyles(
    sectionType: string,
    editMode: boolean,
    motion: number,
    empty: boolean,
  ) {
    return `
			min-height: ${sectionType === "scenes" ? "4.8rem" : `${$itemHeight}px`};
			background-color: ${empty ? "rgba(255, 190, 10, 0.25)" : sectionType === "scenes" ? "rgba(0, 0, 0, 0.125)" : "transparent"};
			outline: ${empty ? "2px dashed #ffc107" : "none"};
			transition: ${
        editMode
          ? `background-color ${motion / 2}ms ease, min-height ${motion}ms ease`
          : "none"
      };
    `;
  }

  function handleDropColumn(newItems: any[], evt: any) {
    let clientX = (evt as any)?.dropPointerX;

    if (!clientX || clientX <= 0) {
      const originalEvt = evt.originalEvent as
        MouseEvent | TouchEvent | undefined;
      if (originalEvt) {
        if (
          "changedTouches" in originalEvt &&
          (originalEvt as TouchEvent).changedTouches?.length
        ) {
          clientX = (originalEvt as TouchEvent).changedTouches[0].clientX;
        } else if (
          "touches" in originalEvt &&
          (originalEvt as TouchEvent).touches?.length
        ) {
          clientX = (originalEvt as TouchEvent).touches[0].clientX;
        } else if (
          "clientX" in originalEvt &&
          typeof (originalEvt as MouseEvent).clientX === "number" &&
          (originalEvt as MouseEvent).clientX > 0
        ) {
          clientX = (originalEvt as MouseEvent).clientX;
        }
      }
    }

    if (clientX !== undefined && clientX > 0 && evt.to) {
      const containerRect = evt.to.getBoundingClientRect();
      const offsetX = Math.max(0, clientX - containerRect.left);
      const firstItem = evt.to.querySelector(".item") as HTMLElement | null;
      const colWidth = firstItem?.offsetWidth || 161.2;
      const gap = parseFloat(getComputedStyle(evt.to).gap) || 5.6;
      const totalColWidth = colWidth + gap;

      // Total columns this section container can visually fit
      const maxCols = Math.max(
        1,
        Math.floor((containerRect.width + gap) / totalColWidth),
      );

      // Calculate target column across the container width
      const targetCol = Math.min(
        maxCols,
        Math.max(1, Math.floor((offsetX / containerRect.width) * maxCols) + 1),
      );

      const draggedId = evt.item?.getAttribute("data-id");
      const movedItem =
        (draggedId
          ? newItems.find((it: any) => String(it?.id) === String(draggedId))
          : null) ?? newItems[evt.newIndex ?? 0];

      if (movedItem) {
        movedItem.col = targetCol;
      }
    }
  }

  function itemStyles(
    type: string,
    item?: any,
    gridPos?: { col: number; row: number; rowSpan: number },
  ) {
    if (type === "bills") {
      return `
				grid-column: 1 / -1;
				width: 100%;
				display: block;
			`;
    }
    const large = [
      "conditional_media",
      "picture_elements",
      "camera",
      "spotify_player_large",
      "entities",
    ];
    if (large.includes(type)) {
      return `
				grid-column: span 2;
				grid-row: span 4;
				display: ${type ? "" : "none"};
			`;
    }
    if (gridPos) {
      return `
				grid-column: ${gridPos.col};
				grid-row: ${gridPos.row} / span ${gridPos.rowSpan};
				display: ${type ? "" : "none"};
			`;
    }
    const isSquare = isItemSquare(item, $buttonTemplateStore.definitions);
    const isMedium = isItemMedium(item, $buttonTemplateStore.definitions);
    const rowSpan = isSquare ? "span 3" : isMedium ? "span 2" : "span 1";
    return `
			grid-column: ${item?.col ? item.col : "span 1"};
			grid-row: ${rowSpan};
			display: ${type ? "" : "none"};
    `;
  }

  let viewSections = $derived(
    $editMode
      ? view?.sections
      : typeof mounted === "boolean" &&
          typeof $mediaQueries === "object" &&
          handleVisibility($editMode, view?.sections, $states),
  );
</script>

<main
  style:transition="opacity {$motion}ms ease, outline-color {$motion}ms ease"
  style:opacity={$editMode && view?.sections.length === 0 ? "0" : "1"}
  use:sortable={{
    group: { name: "section", put: sectionGroupPut },
    animation: $motion,
    disabled: !$editMode,
    ghostClass: "sortable-ghost",
    handle: ".drag-handle",
    items: view.sections,
    onStart: handleDragStart,
    onFinalize: async (newItems) => {
      view.sections = newItems;
      await handleDragEnd();
    },
  }}
  use:onDndReceive={(detail) => receiveSection(null, detail)}
>
  {#each viewSections as section (section?.id)}
    <section
      id={String(section?.id)}
      data-id={section?.id}
      data-section-type={section?.type}
    >
      <!-- horizontal stack -->
      {#if section?.type === "horizontal-stack"}
        <HorizontalStackHeader {view} {section} />

        <div
          class="horizontal-stack"
          style:min-height="{stackHeight}px"
          style:outline="2px dashed {$editMode ? '#ffc008' : 'transparent'}"
          style:transition="min-height {$motion}ms ease, outline {$motion / 2}ms
          ease"
          use:sortable={{
            group: { name: "section", put: sectionGroupPut },
            animation: $motion,
            disabled: !$editMode,
            ghostClass: "sortable-ghost",
            handle: ".drag-handle",
            items: section.sections ?? [],
            onStart: handleDragStart,
            onFinalize: async (newItems) => {
              const stack = view?.sections.find(
                (s: any) =>
                  s.id === section.id &&
                  (s.type === "horizontal-stack" ||
                    s.type === "vertical-stack"),
              );
              if (stack) {
                stack.sections = newItems.map((item: any) => ({
                  ...item,
                  items: item.items ?? [],
                }));
                view.sections = [...view.sections];
              }
              await handleDragEnd();
            },
          }}
          use:onDndReceive={(detail) =>
            receiveSection(String(section.id), detail)}
        >
          {#each section?.sections ?? [] as stackSection (stackSection?.id)}
            <section
              id={String(stackSection.id)}
              data-id={stackSection.id}
              data-section-type={stackSection?.type}
              style:overflow="hidden"
            >
              <!-- nested vertical stack inside horizontal stack -->
              {#if stackSection?.type === "vertical-stack"}
                <VerticalStackHeader {view} section={stackSection} />

                <div
                  class="vertical-stack nested"
                  style:min-height="{stackHeight}px"
                  style:outline="2px dashed {$editMode
                    ? '#08c7ff'
                    : 'transparent'}"
                  style:transition="min-height {$motion}ms ease, outline {$motion /
                    2}ms ease"
                  use:sortable={{
                    group: { name: "section", put: sectionGroupPut },
                    animation: $motion,
                    disabled: !$editMode,
                    ghostClass: "sortable-ghost",
                    handle: ".drag-handle",
                    items: stackSection.sections ?? [],
                    onStart: handleDragStart,
                    onFinalize: async (newItems) => {
                      const parentStack = view?.sections.find(
                        (s: any) =>
                          s.id === section.id && s.type === "horizontal-stack",
                      );
                      if (parentStack) {
                        const nestedStack = parentStack.sections?.find(
                          (s: any) =>
                            s.id === stackSection.id &&
                            s.type === "vertical-stack",
                        );
                        if (nestedStack) {
                          nestedStack.sections = newItems.map((item: any) => ({
                            ...item,
                            items: item.items ?? [],
                          }));
                          view.sections = [...view.sections];
                        }
                      }
                      await handleDragEnd();
                    },
                  }}
                  use:onDndReceive={(detail) =>
                    receiveSection(String(stackSection.id), detail)}
                >
                  {#each stackSection?.sections ?? [] as nestedSection (nestedSection?.id)}
                    {@const empty = $editMode && !nestedSection?.items?.length}
                    {@const gridMap = computeGridPositions(
                      nestedSection?.items ?? [],
                      $buttonTemplateStore.definitions,
                    )}
                    {@const maxCol =
                      gridMap.size > 0
                        ? Math.max(
                            1,
                            ...[...gridMap.values()].map((p) => p.col),
                          )
                        : 1}
                    <section
                      id={String(nestedSection.id)}
                      data-id={nestedSection.id}
                      data-section-type={nestedSection?.type}
                      style:overflow="hidden"
                    >
                      <SectionHeader {view} section={nestedSection} />
                      <div
                        class="items"
                        style={sectionStyles(
                          stackSection?.type,
                          $editMode,
                          $motion,
                          empty,
                        )}
                        style:grid-template-columns={maxCol > 1
                          ? `repeat(${maxCol}, minmax(0, 1fr))`
                          : undefined}
                        use:sortable={{
                          group: "item",
                          animation: $motion,
                          disabled: !$editMode,
                          ghostClass: "sortable-ghost",
                          items: nestedSection.items ?? [],
                          onStart: handleDragStart,
                          onFinalize: async (newItems, evt) => {
                            handleDropColumn(newItems, evt);
                            const parentStack = view?.sections.find(
                              (s: any) =>
                                s.id === section.id &&
                                s.type === "horizontal-stack",
                            );
                            if (parentStack) {
                              const ns = parentStack.sections?.find(
                                (s: any) =>
                                  s.id === stackSection.id &&
                                  s.type === "vertical-stack",
                              );
                              if (ns) {
                                const sec = ns.sections?.find(
                                  (s: any) => s.id === nestedSection.id,
                                );
                                if (sec) {
                                  sec.items = maybeCloneItem(
                                    newItems,
                                    evt.oldIndex ?? 0,
                                    evt.newIndex ?? 0,
                                  );
                                  view.sections = [...view.sections];
                                }
                              }
                            }
                            await handleDragEnd();
                          },
                        }}
                        use:onDndReceive={(detail) =>
                          receiveItem(String(nestedSection.id), detail)}
                      >
                        {#each nestedSection?.items ?? [] as item (item.id)}
                          {@const gridPos =
                            gridMap.get(item?.id) ??
                            gridMap.get(String(item?.id))}
                          <div
                            data-id={item?.id}
                            class="item"
                            class:item-square={isItemSquare(
                              item,
                              $buttonTemplateStore.definitions,
                            )}
                            class:item-medium={isItemMedium(
                              item,
                              $buttonTemplateStore.definitions,
                            )}
                            tabindex="-1"
                            style={itemStyles(item?.type, item, gridPos)}
                          >
                            <Content {item} sectionName={nestedSection?.name} />
                          </div>
                        {/each}
                      </div>
                    </section>
                  {/each}
                </div>
              {:else}
                <!-- regular section inside horizontal stack -->
                {@const empty = $editMode && !stackSection?.items?.length}
                {@const gridMap = computeGridPositions(
                  stackSection?.items ?? [],
                  $buttonTemplateStore.definitions,
                )}
                {@const maxCol =
                  gridMap.size > 0
                    ? Math.max(1, ...[...gridMap.values()].map((p) => p.col))
                    : 1}
                <SectionHeader {view} section={stackSection} />
                <div
                  class="items"
                  style={sectionStyles(
                    section?.type,
                    $editMode,
                    $motion,
                    empty,
                  )}
                  style:grid-template-columns={maxCol > 1
                    ? `repeat(${maxCol}, minmax(0, 1fr))`
                    : undefined}
                  use:sortable={{
                    group: "item",
                    animation: $motion,
                    disabled: !$editMode,
                    ghostClass: "sortable-ghost",
                    items: stackSection.items ?? [],
                    onStart: handleDragStart,
                    onFinalize: async (newItems, evt) => {
                      handleDropColumn(newItems, evt);
                      const sec = view?.sections
                        .find((s: any) =>
                          s.sections?.some(
                            (sub: any) => sub.id === stackSection.id,
                          ),
                        )
                        ?.sections.find(
                          (sub: any) => sub.id === stackSection.id,
                        );
                      if (sec) {
                        sec.items = maybeCloneItem(
                          newItems,
                          evt.oldIndex ?? 0,
                          evt.newIndex ?? 0,
                        );
                        view.sections = [...view.sections];
                      }
                      await handleDragEnd();
                    },
                  }}
                  use:onDndReceive={(detail) =>
                    receiveItem(String(stackSection.id), detail)}
                >
                  {#each stackSection?.items ?? [] as item (item.id)}
                    {@const gridPos =
                      gridMap.get(item?.id) ?? gridMap.get(String(item?.id))}
                    <div
                      data-id={item?.id}
                      class="item"
                      class:item-square={isItemSquare(
                        item,
                        $buttonTemplateStore.definitions,
                      )}
                      class:item-medium={isItemMedium(
                        item,
                        $buttonTemplateStore.definitions,
                      )}
                      tabindex="-1"
                      style={itemStyles(item?.type, item, gridPos)}
                    >
                      <Content {item} sectionName={stackSection?.name} />
                    </div>
                  {/each}
                </div>
              {/if}
            </section>
          {/each}
        </div>

        <!-- vertical stack -->
      {:else if section?.type === "vertical-stack"}
        <VerticalStackHeader {view} {section} />

        <div
          class="vertical-stack"
          style:min-height="{stackHeight}px"
          style:outline="2px dashed {$editMode ? '#08c7ff' : 'transparent'}"
          style:transition="min-height {$motion}ms ease, outline {$motion / 2}ms
          ease"
          use:sortable={{
            group: { name: "section", put: sectionGroupPut },
            animation: $motion,
            disabled: !$editMode,
            ghostClass: "sortable-ghost",
            handle: ".drag-handle",
            items: section.sections ?? [],
            onStart: handleDragStart,
            onFinalize: async (newItems) => {
              const stack = view?.sections.find(
                (s: any) =>
                  s.id === section.id &&
                  (s.type === "horizontal-stack" ||
                    s.type === "vertical-stack"),
              );
              if (stack) {
                stack.sections = newItems.map((item: any) => ({
                  ...item,
                  items: item.items ?? [],
                }));
                view.sections = [...view.sections];
              }
              await handleDragEnd();
            },
          }}
          use:onDndReceive={(detail) =>
            receiveSection(String(section.id), detail)}
        >
          {#each section?.sections ?? [] as stackSection (stackSection?.id)}
            {@const empty = $editMode && !stackSection?.items?.length}
            {@const gridMap = computeGridPositions(
              stackSection?.items ?? [],
              $buttonTemplateStore.definitions,
            )}
            {@const maxCol =
              gridMap.size > 0
                ? Math.max(1, ...[...gridMap.values()].map((p) => p.col))
                : 1}
            <section
              id={String(stackSection.id)}
              data-id={stackSection.id}
              data-section-type={stackSection?.type}
              style:overflow="hidden"
            >
              <SectionHeader {view} section={stackSection} />
              <div
                class="items"
                style={sectionStyles(section?.type, $editMode, $motion, empty)}
                style:grid-template-columns={maxCol > 1
                  ? `repeat(${maxCol}, minmax(0, var(--square-size)))`
                  : undefined}
                use:sortable={{
                  group: "item",
                  animation: $motion,
                  disabled: !$editMode,
                  ghostClass: "sortable-ghost",
                  items: stackSection.items ?? [],
                  onStart: handleDragStart,
                  onFinalize: async (newItems, evt) => {
                    handleDropColumn(newItems, evt);
                    const sec = view?.sections
                      .find((s: any) =>
                        s.sections?.some(
                          (sub: any) => sub.id === stackSection.id,
                        ),
                      )
                      ?.sections.find((sub: any) => sub.id === stackSection.id);
                    if (sec) {
                      sec.items = maybeCloneItem(
                        newItems,
                        evt.oldIndex ?? 0,
                        evt.newIndex ?? 0,
                      );
                      view.sections = [...view.sections];
                    }
                    await handleDragEnd();
                  },
                }}
                use:onDndReceive={(detail) =>
                  receiveItem(String(stackSection.id), detail)}
              >
                {#each stackSection?.items ?? [] as item (item.id)}
                  {@const gridPos =
                    gridMap.get(item?.id) ?? gridMap.get(String(item?.id))}
                  <div
                    data-id={item?.id}
                    class="item"
                    class:item-square={isItemSquare(
                      item,
                      $buttonTemplateStore.definitions,
                    )}
                    class:item-medium={isItemMedium(
                      item,
                      $buttonTemplateStore.definitions,
                    )}
                    tabindex="-1"
                    style={itemStyles(item?.type, item, gridPos)}
                  >
                    <Content {item} sectionName={stackSection?.name} />
                  </div>
                {/each}
              </div>
            </section>
          {/each}
        </div>

        <!-- scenes -->
      {:else if section?.type === "scenes"}
        {@const empty = $editMode && !section?.items?.length}
        <SectionHeader {view} {section} />
        <div
          class="scenes"
          style={sectionStyles(section?.type, $editMode, $motion, empty)}
          use:sortable={{
            group: "item",
            animation: $motion,
            disabled: !$editMode,
            ghostClass: "sortable-ghost",
            items: section.items ?? [],
            onStart: handleDragStart,
            onFinalize: async (newItems, evt) => {
              const sec = view?.sections.find((s: any) => s.id === section.id);
              if (sec) {
                sec.items = maybeCloneItem(
                  newItems,
                  evt.oldIndex ?? 0,
                  evt.newIndex ?? 0,
                );
                view.sections = [...view.sections];
              }
              await handleDragEnd();
            },
          }}
          use:onDndReceive={(detail) => receiveItem(String(section.id), detail)}
        >
          {#each section?.items ?? [] as item, index (item.id)}
            <div
              data-id={item?.id}
              tabindex="-1"
              class:divider={index !== section?.items?.length - 1}
            >
              <Scenes sel={item} />
            </div>
          {/each}
        </div>

        <!-- bills section -->
      {:else if section?.type === "bills"}
        <SectionHeader {view} {section} />
        <div class="bills-section">
          <Bills sel={section} />
        </div>

        <!-- normal -->
      {:else}
        {@const empty = $editMode && !section?.items?.length}
        {@const hasBills = section?.items?.some(
          (it: any) => it?.type === "bills",
        )}
        {@const gridMap = computeGridPositions(
          section?.items ?? [],
          $buttonTemplateStore.definitions,
        )}
        {@const maxCol =
          gridMap.size > 0
            ? Math.max(1, ...[...gridMap.values()].map((p) => p.col))
            : 1}

        <SectionHeader {view} {section} />

        <div
          class="items"
          class:has-full-width-item={hasBills}
          style={sectionStyles(section?.type, $editMode, $motion, empty)}
          style:grid-template-columns={hasBills
            ? "1fr"
            : maxCol > 1
              ? `repeat(${maxCol}, minmax(0, var(--square-size)))`
              : undefined}
          use:sortable={{
            group: "item",
            animation: $motion,
            disabled: !$editMode,
            ghostClass: "sortable-ghost",
            items: section.items ?? [],
            onStart: handleDragStart,
            onFinalize: async (newItems, evt) => {
              handleDropColumn(newItems, evt);
              const sec = view?.sections.find((s: any) => s.id === section.id);
              if (sec) {
                sec.items = maybeCloneItem(
                  newItems,
                  evt.oldIndex ?? 0,
                  evt.newIndex ?? 0,
                );
                view.sections = [...view.sections];
              }
              await handleDragEnd();
            },
          }}
          use:onDndReceive={(detail) => receiveItem(String(section.id), detail)}
        >
          {#each section?.items ?? [] as item (item.id)}
            {@const gridPos =
              gridMap.get(item?.id) ?? gridMap.get(String(item?.id))}
            <div
              data-id={item?.id}
              class="item"
              class:item-full-width={item?.type === "bills"}
              class:item-square={isItemSquare(
                item,
                $buttonTemplateStore.definitions,
              )}
              class:item-medium={isItemMedium(
                item,
                $buttonTemplateStore.definitions,
              )}
              tabindex="-1"
              style={itemStyles(item?.type, item, gridPos)}
            >
              <Content {item} sectionName={section?.name} />
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/each}
</main>

<style>
  main {
    grid-area: main;
    padding: 0 1.25rem 1.25rem;
    display: grid;
    gap: 1.15rem;
    outline: transparent;
    align-content: start;
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
  }

  section {
    display: grid;
    align-content: start;
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .bills-section {
    width: 100%;
    display: block;
    min-width: 0;
    max-width: 100%;
  }

  .items.has-full-width-item {
    display: flex !important;
    flex-direction: column !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .item.item-full-width {
    grid-column: 1 / -1 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .horizontal-stack {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 1.15rem;
    border-radius: 0.65rem;
    outline-offset: 3px;
  }

  .vertical-stack {
    display: grid;
    grid-auto-flow: row;
    grid-auto-rows: min-content;
    gap: 1.15rem;
    border-radius: 0.65rem;
    outline-offset: 3px;
  }

  /* without stack padding a negative offset would draw over the items,
	   0 keeps the nested outline just inside the parent's 3px-offset outline */
  .vertical-stack.nested {
    outline-offset: 0;
  }

  .items {
    --item-height: 50px;
    --item-gap: 0.35rem;
    --square-size: calc((var(--item-height) * 3) + (var(--item-gap) * 2));
    --medium-size: calc((var(--item-height) * 2) + var(--item-gap));
    border-radius: 0.6rem;
    outline-offset: -2px;
    display: grid;
    grid-template-columns: repeat(auto-fill, var(--square-size));
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-rows: var(--item-height);
    grid-auto-flow: row dense;
    align-items: start;
    gap: var(--item-gap);
    border-radius: 0.6rem;
    height: 100%;
  }

  .item {
    position: relative;
    border-radius: 0.65rem;
    align-self: start;
    height: fit-content;
    min-width: 0;
  }

  .item.item-square {
    grid-row: span 3;
    height: var(--square-size);
  }

  .item.item-medium {
    grid-row: span 2;
    height: var(--medium-size);
  }

  /* Phone and Tablet (portrait) */
  @media all and (max-width: 768px) {
    main {
      padding: 0 1.25rem 1.25rem 1.25rem;
    }

    .horizontal-stack {
      grid-auto-flow: row;
      gap: 1.5rem;
    }

    .items {
      display: flex;
      flex-wrap: wrap;
    }
  }

  .scenes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    border-radius: 0.65rem;
    overflow: hidden;
    min-height: 5rem;
  }

  .scenes > .divider {
    border-right: 1px solid transparent;
  }

  :global(.sortable-ghost) {
    opacity: 0.4;
  }

  :global(.sortable-chosen) {
    outline: 2px dashed rgb(255, 192, 8);
    outline-offset: -2px;
    border-radius: 0.65rem;
  }
</style>
