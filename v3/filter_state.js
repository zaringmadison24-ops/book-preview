/* 筛选层级的唯一状态规则：上级变化时，所有下级条件立即失效。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BookFilterState = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const groupKey = (collection, group) => collection + "|" + group;
  const categoryKey = (collection, group, category) => groupKey(collection, group) + "|" + category;
  const subcategoryKey = (collection, group, category, subcategory) =>
    categoryKey(collection, group, category) + "|" + subcategory;

  function only(set) {
    return set.size === 1 ? set.values().next().value : null;
  }

  function clearBelowCollection(sel) {
    sel.groups.clear();
    sel.categories.clear();
    sel.subcategories.clear();
    sel.formats.clear();
  }

  function clearBelowGroup(sel) {
    sel.categories.clear();
    sel.subcategories.clear();
    sel.formats.clear();
  }

  function selectCollection(sel, collection) {
    const previous = only(sel.collections);
    sel.collections.clear();
    if (previous !== collection) sel.collections.add(collection);
    clearBelowCollection(sel);
  }

  // 空集合状态代表一级筛选的“全部”：不带任何书库、左右手或分类限制。
  function selectAll(sel) {
    sel.collections.clear();
    clearBelowCollection(sel);
  }

  function selectGroup(sel, collection, group) {
    selectGroups(sel, [groupKey(collection, group)]);
  }

  // “全部”或一个书库下选择左右手时，同名方向可对应多个书库。
  function selectGroups(sel, nextKeys) {
    const next = new Set(nextKeys);
    const unchanged = next.size === sel.groups.size && [...next].every(key => sel.groups.has(key));
    sel.groups.clear();
    if (!unchanged) for (const key of next) sel.groups.add(key);
    clearBelowGroup(sel);
  }

  function isReady(sel) {
    const collection = only(sel.collections);
    if (sel.collections.size > 1) return false;
    if (collection && [...sel.groups].some(group => !group.startsWith(collection + "|"))) return false;
    return true;
  }

  function matches(sel, book) {
    if (!isReady(sel)) return false;
    if (sel.collections.size && !sel.collections.has(book.collection)) return false;
    if (sel.groups.size && !sel.groups.has(groupKey(book.collection, book.group))) return false;
    if (sel.categories.size && !sel.categories.has(categoryKey(book.collection, book.group, book.category))) return false;
    if (sel.subcategories.size && !sel.subcategories.has(
      subcategoryKey(book.collection, book.group, book.category, book.subcategory || "")
    )) return false;
    if (sel.formats.size && !sel.formats.has(book.format)) return false;
    return true;
  }

  return {
    groupKey,
    categoryKey,
    subcategoryKey,
    selectAll,
    selectCollection,
    selectGroup,
    selectGroups,
    isReady,
    matches,
  };
});
