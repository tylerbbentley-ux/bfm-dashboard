/* BFM dashboard — vanilla, no dependencies, no network.
   Three jobs: switch tabs, sort tables, remember the theme. */
(function () {
  "use strict";

  /* ---- theme ------------------------------------------------------ */
  var KEY = "bfm-dash-theme";
  function applyTheme(t) {
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }
  try { applyTheme(localStorage.getItem(KEY)); } catch (e) {}
  var btn = document.getElementById("themebtn");
  if (btn) {
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      var next;
      if (!cur) { next = prefersDark ? "light" : "dark"; }
      else if (cur === "dark") { next = "light"; }
      else { next = "dark"; }
      applyTheme(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  /* ---- tabs ------------------------------------------------------- */
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".tabbtn"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".tabpanel"));
  function show(id) {
    var found = false;
    panels.forEach(function (p) {
      var on = p.id === "tab-" + id;
      p.classList.toggle("is-active", on);
      if (on) { found = true; }
    });
    buttons.forEach(function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-tab") === id ? "true" : "false");
    });
    return found;
  }
  if (buttons.length) {
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-tab");
        show(id);
        if (history.replaceState) { history.replaceState(null, "", "#" + id); }
      });
    });
    var start = (location.hash || "").replace(/^#/, "");
    if (!start || !show(start)) { show(buttons[0].getAttribute("data-tab")); }
  }

  /* ---- sortable tables -------------------------------------------- */
  function cellValue(row, i) {
    var td = row.cells[i];
    if (!td) { return ""; }
    return (td.innerText || td.textContent || "").trim();
  }
  function asNumber(s) {
    var cleaned = s.replace(/[,%$\s]/g, "").replace(/[+]/, "");
    if (cleaned === "" || cleaned === "—") { return null; }
    var n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  Array.prototype.slice.call(document.querySelectorAll("table.sortable")).forEach(function (table) {
    var head = table.tHead;
    var body = table.tBodies[0];
    if (!head || !body) { return; }
    Array.prototype.slice.call(head.rows[0].cells).forEach(function (th, i) {
      var dir = 0;
      th.addEventListener("click", function () {
        dir = dir === 1 ? -1 : 1;
        var rows = Array.prototype.slice.call(body.rows);
        rows.sort(function (a, b) {
          var av = cellValue(a, i), bv = cellValue(b, i);
          var an = asNumber(av), bn = asNumber(bv);
          /* Rows with no value always sink, whichever way we are sorting —
             a blank is not a small number. */
          if (an === null && bn === null) { return av.localeCompare(bv) * dir; }
          if (an === null) { return 1; }
          if (bn === null) { return -1; }
          return (an - bn) * dir;
        });
        rows.forEach(function (r) { body.appendChild(r); });
        Array.prototype.slice.call(head.rows[0].cells).forEach(function (o) {
          o.removeAttribute("aria-sort");
        });
        th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
      });
    });
  });

  /* ---- filters (P1) ------------------------------------------------
     A filter narrows the CURRENT VIEW and nothing else. It never removes a
     company from the universe, never changes eligibility, and Reset puts
     every row back. A row whose selected value is not computed carries no
     attribute for it, so a minimum-return filter hides it rather than
     treating the missing number as a zero — and the count line says how
     many rows are hidden for that reason, because a silently shorter table
     is how a missing value starts looking like a bad one. */
  Array.prototype.slice.call(document.querySelectorAll(".filterbar")).forEach(function (bar) {
    var table = document.getElementById(bar.getAttribute("data-filters-for"));
    if (!table || !table.tBodies[0]) { return; }
    var body = table.tBodies[0];
    var text = bar.querySelector(".fb-text");
    var min = bar.querySelector(".fb-min");
    var basis = bar.querySelector(".fb-basis");
    var sector = bar.querySelector(".fb-sector");
    var coverage = bar.querySelector(".fb-coverage");
    var rail = bar.querySelector(".fb-rail");
    var depth = bar.querySelector(".fb-depth");
    var scoreable = bar.querySelector(".fb-scoreable");
    var minMarket = bar.querySelector(".fb-min-market");
    var maxPe = bar.querySelector(".fb-max-pe");
    var reset = bar.querySelector(".fb-reset");
    var count = bar.querySelector(".fb-count");

    function apply() {
      var q = (text && text.value || "").trim().toLowerCase();
      var floor = min && min.value !== "" ? parseFloat(min.value) : null;
      var key = basis ? basis.value : "ev";
      var group = sector ? sector.value : "";
      var researchState = coverage ? coverage.value : "";
      var selectedRail = rail ? rail.value : "";
      var selectedDepth = depth ? depth.value : "";
      var selectedScoreable = scoreable ? scoreable.value : "";
      var marketFloor = minMarket && minMarket.value !== "" ?
                        parseFloat(minMarket.value) * 1000000 : null;
      var peCeiling = maxPe && maxPe.value !== "" ? parseFloat(maxPe.value) : null;
      var shown = 0, hiddenNoValue = 0, total = 0;
      Array.prototype.slice.call(body.rows).forEach(function (row) {
        total += 1;
        var on = true;
        if (q) {
          var name = (row.getAttribute("data-ticker") || "").toLowerCase();
          if (name.indexOf(q) === -1) { on = false; }
        }
        if (on && group && (row.getAttribute("data-sector") || "") !== group) {
          on = false;
        }
        if (on && researchState &&
            (row.getAttribute("data-coverage-state") || "") !== researchState) {
          on = false;
        }
        if (on && selectedRail &&
            (row.getAttribute("data-rail") || "") !== selectedRail) {
          on = false;
        }
        if (on && selectedDepth &&
            (row.getAttribute("data-depth") || "") !== selectedDepth) {
          on = false;
        }
        if (on && selectedScoreable &&
            (row.getAttribute("data-scoreable") || "") !== selectedScoreable) {
          on = false;
        }
        if (on && marketFloor !== null && !isNaN(marketFloor)) {
          var marketRaw = row.getAttribute("data-market-cap");
          if (marketRaw === null || marketRaw === "") {
            on = false; hiddenNoValue += 1;
          } else if (parseFloat(marketRaw) < marketFloor) {
            on = false;
          }
        }
        if (on && peCeiling !== null && !isNaN(peCeiling)) {
          var peRaw = row.getAttribute("data-forward-pe");
          if (peRaw === null || peRaw === "") {
            on = false; hiddenNoValue += 1;
          } else if (parseFloat(peRaw) > peCeiling) {
            on = false;
          }
        }
        if (on && floor !== null && !isNaN(floor)) {
          var raw = row.getAttribute("data-up-" + key);
          if (raw === null || raw === "") { on = false; hiddenNoValue += 1; }
          else if (parseFloat(raw) < floor) { on = false; }
        }
        row.style.display = on ? "" : "none";
        if (on) { shown += 1; }
      });
      if (count) {
        var msg = shown + " of " + total + " names shown.";
        if (hiddenNoValue > 0) {
          msg += " " + hiddenNoValue + " are hidden because the selected " +
                 "value is not computed for them, which is not the same as " +
                 "being below the number.";
        }
        if (shown < total) { msg += " Reset returns the whole universe."; }
        count.textContent = msg;
      }
    }

    [text, min, basis, sector, coverage, rail, depth, scoreable,
     minMarket, maxPe].forEach(function (el) {
      if (!el) { return; }
      el.addEventListener("input", apply);
      el.addEventListener("change", apply);
    });
    if (reset) {
      reset.addEventListener("click", function () {
        if (text) { text.value = ""; }
        if (min) { min.value = ""; }
        if (basis) { basis.selectedIndex = 0; }
        if (sector) { sector.selectedIndex = 0; }
        if (coverage) { coverage.selectedIndex = 0; }
        if (rail) { rail.selectedIndex = 0; }
        if (depth) { depth.selectedIndex = 0; }
        if (scoreable) { scoreable.selectedIndex = 0; }
        if (minMarket) { minMarket.value = ""; }
        if (maxPe) { maxPe.value = ""; }
        apply();
      });
    }
    apply();
  });
})();
