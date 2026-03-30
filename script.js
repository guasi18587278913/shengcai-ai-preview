(function () {
  "use strict";

  var API_BASE = "data/";

  function $(sel) {
    return document.querySelector(sel);
  }
  function $$(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  var dom = {
    navItems: $$("[data-nav-item]"),
    sections: $$("[data-section]"),
    supermarkCount: $("[data-supermark-count]"),
    feedList: $("[data-feed-list]"),
    projectCount: $("[data-project-count]"),
    projectTabs: $("[data-project-tabs]"),
    projectList: $("[data-project-list]"),
    activityList: $("[data-activity-list]"),
    meetingList: $("[data-meeting-list]"),
    exampleQuestions: $("[data-example-questions]"),
    questionInput: $("[data-question-input]"),
  };

  var projectState = {
    activeTab: "all",
    categories: [],
    items: [],
    total: 0,
  };

  /* ── Utilities ── */

  function fmt(n) {
    n = Number(n || 0);
    if (!n) return "0";
    if (n >= 10000)
      return (
        (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "万"
      );
    return String(n);
  }

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function apiUrl(path) {
    return new URL(API_BASE + path, window.location.href).toString();
  }

  async function api(path) {
    var res = await fetch(apiUrl(path + ".json"), {
      headers: { accept: "application/json" },
    });
    var payload = await res.json();
    if (!res.ok || payload.success === false) {
      throw new Error(payload.message || path + " 加载失败");
    }
    return payload.data;
  }

  /* ── Render: 超级标 ── */

  var FALLBACK_GRADIENTS = ["", "feed-card-img--warm", "feed-card-img--cool"];
  var ROW_GRADIENTS = ["", "feed-row-img--warm", "feed-row-img--cool"];
  var SUPERMARK_LIMIT = 6;

  function renderSupermarks(data) {
    dom.supermarkCount.textContent = data.total + " 条";

    if (!data.items.length) {
      dom.feedList.innerHTML =
        '<div class="sec-empty">暂无超级标数据</div>';
      return;
    }

    var all = data.items.slice(0, SUPERMARK_LIMIT);
    var hero = all[0];
    var rest = all.slice(1);

    /* Hero card — first item, full image treatment */
    var heroMedia = hero.image
      ? '<img src="' +
        esc(hero.image) +
        '" alt="' +
        esc(hero.title) +
        '" loading="lazy" />'
      : '<span class="feed-card-fallback">' +
        esc(
          hero.title.replace(/^【?超级标\d+】?/, "").slice(0, 10) || "超级标"
        ) +
        "</span>";

    var heroHtml =
      '<article class="feed-card">' +
      '<div class="feed-card-img">' +
      heroMedia +
      "</div>" +
      '<div class="feed-card-body">' +
      "<h3>" +
      esc(hero.title) +
      "</h3>" +
      "<p>" +
      esc(hero.summary || "") +
      "</p>" +
      '<div class="feed-card-meta">' +
      '<span class="feed-card-stat">' +
      fmt(hero.likes) +
      " 赞 · " +
      fmt(hero.comments) +
      " 评论</span>" +
      '<a class="btn btn-ghost btn-sm" href="' +
      esc(hero.url) +
      '" target="_blank" rel="noopener">查看详情</a>' +
      "</div></div></article>";

    /* Compact rows — remaining items with thumbnails */
    var rows = rest.map(function (item, idx) {
      var gradientCls = ROW_GRADIENTS[(idx + 1) % ROW_GRADIENTS.length];
      var imgCls = "feed-row-img" + (gradientCls ? " " + gradientCls : "");
      var media = item.image
        ? '<img src="' +
          esc(item.image) +
          '" alt="' +
          esc(item.title) +
          '" loading="lazy" />'
        : '<span class="feed-row-fallback">' +
          esc(
            item.title.replace(/^【?超级标\d+】?/, "").slice(0, 6) || "超级标"
          ) +
          "</span>";

      return (
        '<a class="feed-row" href="' +
        esc(item.url) +
        '" target="_blank" rel="noopener">' +
        '<div class="' +
        imgCls +
        '">' +
        media +
        "</div>" +
        '<div class="feed-row-body">' +
        "<strong>" +
        esc(item.title) +
        "</strong>" +
        "<span>" +
        fmt(item.likes) +
        " 赞 · " +
        fmt(item.comments) +
        " 评论</span>" +
        "</div>" +
        '<span class="feed-row-link">查看</span>' +
        "</a>"
      );
    });

    var compactHtml = rows.length
      ? '<div class="feed-compact">' + rows.join("") + "</div>"
      : "";

    var footer =
      '<div class="sec-footer">' +
      '<a class="btn btn-ghost" href="https://scys.com/tag/2634453" target="_blank" rel="noopener">去官网看全部 ' +
      data.total +
      " 条</a></div>";

    dom.feedList.innerHTML = heroHtml + compactHtml + footer;
  }

  /* ── Render: 项目库 ── */

  function getActiveItems() {
    if (projectState.activeTab === "all") return projectState.items;
    return projectState.items.filter(function (i) {
      return i.bucket === projectState.activeTab;
    });
  }

  function renderProjectRows() {
    var items = getActiveItems();
    dom.projectCount.textContent =
      items.length + " / " + projectState.total + " 个";

    if (!items.length) {
      dom.projectList.innerHTML =
        '<div class="sec-empty">该分类下暂无项目</div>';
      return;
    }

    var PROJECT_LIMIT = 20;
    var thead =
      '<div class="proj-thead">' +
      "<span>项目</span><span>平台</span><span>收入</span>" +
      "</div>";

    var rows = items.slice(0, PROJECT_LIMIT).map(function (item) {
      return (
        '<a class="proj-row" href="' +
        esc(item.url) +
        '" target="_blank" rel="noopener">' +
        '<span class="proj-row-name">' +
        esc(item.name) +
        "</span>" +
        '<span class="proj-row-platform">' +
        esc(item.platform) +
        "</span>" +
        '<span class="proj-row-signal">' +
        esc(item.signal) +
        "</span>" +
        "</a>"
      );
    });

    var footer =
      items.length > PROJECT_LIMIT
        ? '<div class="sec-footer">' +
          '<a class="btn btn-ghost" href="https://scys.com/money-ideas" target="_blank" rel="noopener">进入项目库看全部 ' +
          projectState.total +
          " 个</a></div>"
        : "";

    dom.projectList.innerHTML =
      '<div class="proj-table">' + thead + rows.join("") + "</div>" + footer;
  }

  function renderProjectTabs() {
    dom.projectTabs.innerHTML = projectState.categories
      .map(function (cat) {
        var cls =
          cat.id === projectState.activeTab ? "tab-chip is-active" : "tab-chip";
        return (
          '<button class="' +
          cls +
          '" type="button" data-tab="' +
          esc(cat.id) +
          '">' +
          esc(cat.label) +
          "</button>"
        );
      })
      .join("");

    dom.projectTabs.querySelectorAll("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        projectState.activeTab = btn.getAttribute("data-tab") || "all";
        renderProjectTabs();
        renderProjectRows();
      });
    });
  }

  function renderProjects(data) {
    projectState.total = data.total;
    projectState.items = data.items || [];
    projectState.categories = data.categories || [
      { id: "all", label: "全部" },
    ];
    renderProjectTabs();
    renderProjectRows();
  }

  /* ── Render: 大航海 ── */

  function statusClass(label) {
    if (/进行中/.test(label)) return "act-status--active";
    if (/报名中/.test(label)) return "act-status--signup";
    if (/即将/.test(label)) return "act-status--upcoming";
    if (/已结束/.test(label)) return "act-status--ended";
    return "act-status--active";
  }

  function simplifyDate(dateLabel) {
    return String(dateLabel || "").replace(/\s+\d{2}:\d{2}/g, "");
  }

  function statusRowClass(label) {
    if (/进行中/.test(label)) return "act-row-status--active";
    if (/报名中/.test(label)) return "act-row-status--signup";
    if (/即将/.test(label)) return "act-row-status--upcoming";
    if (/已结束/.test(label)) return "act-row-status--ended";
    return "act-row-status--active";
  }

  function renderActivities(data) {
    if (!data.items.length) {
      dom.activityList.innerHTML =
        '<div class="sec-empty">暂无航海数据</div>';
      return;
    }

    var thead =
      '<div class="act-thead">' +
      "<span>状态</span><span>活动</span><span>日期</span><span>报名</span>" +
      "</div>";

    var rows = data.items.map(function (item) {
      return (
        '<a class="act-row" href="' +
        esc(item.handbookUrl) +
        '" target="_blank" rel="noopener">' +
        '<span class="act-row-status ' +
        statusRowClass(item.statusLabel) +
        '">' +
        esc(item.statusLabel) +
        "</span>" +
        '<span class="act-row-name">' +
        esc(item.title) +
        "</span>" +
        '<span class="act-row-date">' +
        esc(simplifyDate(item.dateLabel)) +
        "</span>" +
        '<span class="act-row-count">' +
        fmt(item.joinCount) +
        "</span>" +
        "</a>"
      );
    });

    dom.activityList.innerHTML =
      '<div class="act-table">' + thead + rows.join("") + "</div>";
  }

  /* ── Render: 线下沙龙 ── */

  function renderMeetings(data) {
    if (!data.items.length) {
      dom.meetingList.innerHTML =
        '<div class="sec-empty">暂无线下沙龙数据</div>';
      return;
    }

    dom.meetingList.innerHTML = data.items
      .map(function (item) {
        return (
          '<article class="meetup-card">' +
          '<div class="meetup-top">' +
          '<span class="meetup-city">' +
          esc(item.city) +
          "</span>" +
          '<span class="meetup-date">' +
          esc(item.dateLabel) +
          "</span>" +
          "</div>" +
          "<h3>" +
          esc(item.title) +
          "</h3>" +
          '<p class="meetup-host">主理人：' +
          esc(item.hostName) +
          "</p>" +
          '<div class="meetup-bottom">' +
          '<span class="meetup-count">' +
          (item.joinCount > 3
            ? fmt(item.joinCount) + " 人报名"
            : "新活动") +
          "</span>" +
          '<a class="btn btn-ghost btn-sm" href="' +
          esc(item.url) +
          '" target="_blank" rel="noopener">查看活动</a>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  /* ── Render: 创业导师 ── */

  function renderQuestions(data) {
    var items = data.items || [];

    if (!items.length) {
      dom.exampleQuestions.innerHTML =
        '<button class="example-btn" type="button">暂无示例问题，直接去 AI 问答</button>';
      return;
    }

    dom.exampleQuestions.innerHTML = items
      .slice(0, 6)
      .map(function (q) {
        return (
          '<button class="example-btn" type="button" data-q="' +
          esc(q) +
          '">' +
          esc(q) +
          "</button>"
        );
      })
      .join("");

    dom.exampleQuestions
      .querySelectorAll("[data-q]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          var q = btn.getAttribute("data-q") || "";
          dom.questionInput.value = q;
          dom.questionInput.focus({ preventScroll: true });
          dom.questionInput.setSelectionRange(q.length, q.length);
        });
      });
  }

  /* ── Nav highlight ── */

  function setupNav() {
    if (!("IntersectionObserver" in window) || !dom.navItems.length) return;

    var map = new Map(
      dom.navItems.map(function (el) {
        return [el.getAttribute("data-nav-item"), el];
      })
    );

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (e) {
            return e.isIntersecting;
          })
          .sort(function (a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          })[0];

        if (!visible) return;

        var name = visible.target.getAttribute("data-section");
        map.forEach(function (el, key) {
          el.classList.toggle("is-active", key === name);
        });
      },
      {
        threshold: [0.15, 0.4],
        rootMargin: "-18% 0px -50% 0px",
      }
    );

    dom.sections.forEach(function (sec) {
      observer.observe(sec);
    });
  }

  /* ── Smooth scroll ── */

  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href");
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var y =
          target.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  /* ── Init ── */

  async function init() {
    setupNav();
    setupSmoothScroll();

    await Promise.all([
      api("supermarks")
        .then(renderSupermarks)
        .catch(function (e) {
          dom.supermarkCount.textContent = "加载失败";
          dom.feedList.innerHTML =
            '<div class="sec-empty">' + esc(e.message) + "</div>";
        }),

      api("projects")
        .then(renderProjects)
        .catch(function (e) {
          dom.projectCount.textContent = "加载失败";
          dom.projectList.innerHTML =
            '<div class="sec-empty">' + esc(e.message) + "</div>";
        }),

      api("activities")
        .then(renderActivities)
        .catch(function (e) {
          dom.activityList.innerHTML =
            '<div class="sec-empty">' + esc(e.message) + "</div>";
        }),

      api("meetings")
        .then(renderMeetings)
        .catch(function (e) {
          dom.meetingList.innerHTML =
            '<div class="sec-empty">' + esc(e.message) + "</div>";
        }),

      api("questions")
        .then(renderQuestions)
        .catch(function (e) {
          dom.exampleQuestions.innerHTML =
            '<button class="example-btn" type="button">' +
            esc(e.message) +
            "</button>";
        }),
    ]);
  }

  init();
})();
