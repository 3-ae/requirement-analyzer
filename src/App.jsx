import { useState, useCallback, useMemo, useEffect } from "react";

const generateId = () => Math.random().toString(36).slice(2, 10);

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "◉" },
  { id: "problem", label: "Problem & Purpose", icon: "◎" },
  { id: "context", label: "User Context", icon: "◈" },
  { id: "assumptions", label: "Assumptions", icon: "◇" },
  { id: "edges", label: "Edge Cases", icon: "◆" },
  { id: "scope", label: "Scope & Versions", icon: "◫" },
  { id: "questions", label: "Open Questions", icon: "◻" },
  { id: "summary", label: "Summary", icon: "◼" },
];

const ORIGIN_OPTIONS = [
  "User Research", "Business Metric", "Competitor Analysis",
  "Stakeholder Request", "Technical Debt", "Other",
];

const VERSION_PHASES = ["MVP", "V1", "V1.1", "V2", "Future", "Cut"];
const VERSION_COLORS = {
  MVP: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  V1: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  "V1.1": { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  V2: { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
  Future: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" },
  Cut: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200", dot: "bg-red-400" },
};
const PRIORITY_LEVELS = ["Must", "Should", "Could", "Won't"];

const ASSUMPTION_STATUSES = ["Unvalidated", "Needs Research", "Validated", "Disproven"];
const QUESTION_TYPES = ["Can Answer Now", "Needs Stakeholder Decision", "Needs User Research"];
const QUESTION_STATUSES = ["Open", "Answered"];
const CONFIDENCE_LEVELS = ["Low", "Medium", "High"];

const EDGE_CASE_ITEMS = [
  { id: "empty", label: "Empty state", hint: "What does the user see when there's no data?" },
  { id: "error", label: "Error state", hint: "What happens when something fails?" },
  { id: "loading", label: "Loading state", hint: "What's shown during data fetch or processing?" },
  { id: "firstTime", label: "First-time experience", hint: "How does a new user encounter this?" },
  { id: "returning", label: "Returning user", hint: "Does behavior change for repeat use?" },
  { id: "permissions", label: "Permission / access variations", hint: "Different roles, restricted access?" },
  { id: "offline", label: "Offline / connectivity", hint: "What if the connection drops?" },
  { id: "dataLimits", label: "Data extremes", hint: "Too much data? Too little? Unexpected formats?" },
  { id: "mobile", label: "Responsive / mobile", hint: "Does this need to work across breakpoints?" },
  { id: "accessibility", label: "Accessibility", hint: "Keyboard nav, screen readers, contrast?" },
];

const createBlankAnalysis = (name = "Untitled Analysis") => ({
  id: generateId(),
  name,
  phase: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  overview: { featureName: "", date: "", requestor: "", description: "", origin: "" },
  problem: { problem: "", who: "", outcome: "", metrics: "", ifNotBuilt: "" },
  context: { segments: "", workflow: "", workarounds: "", triggers: "", beforeAfter: "" },
  assumptions: [],
  edges: EDGE_CASE_ITEMS.reduce((acc, item) => {
    acc[item.id] = { considered: false, notes: "" };
    return acc;
  }, {}),
  scope: {
    affected: "",
    newPatterns: "",
    technical: "",
    items: [],
  },
  questions: [],
  summary: { confidence: "", concerns: "", nextSteps: "" },
});

function getCompletion(analysis) {
  const overview = analysis.overview;
  const hasSomeOverview = overview.featureName || overview.description || overview.origin;

  const problem = analysis.problem;
  const problemCount = [problem.problem, problem.who, problem.outcome, problem.metrics, problem.ifNotBuilt]
    .filter(Boolean).length;
  const problemPct = (problemCount / 5) * 100;

  const context = analysis.context;
  const contextCount = [context.segments, context.workflow, context.workarounds, context.triggers, context.beforeAfter]
    .filter(Boolean).length;
  const contextPct = (contextCount / 5) * 100;

  const assumptionsTotal = analysis.assumptions.length;
  const edgesTotal = EDGE_CASE_ITEMS.length;
  const edgesConsidered = EDGE_CASE_ITEMS.filter(item => analysis.edges[item.id]?.considered).length;
  const edgesPct = (edgesConsidered / edgesTotal) * 100;

  const scopeItems = analysis.scope?.items?.length || 0;
  const questionsTotal = analysis.questions.length;

  const summary = analysis.summary;
  const summaryCount = [summary.confidence, summary.concerns, summary.nextSteps].filter(Boolean).length;
  const summaryPct = (summaryCount / 3) * 100;

  const sections = [
    hasSomeOverview,
    problemPct,
    contextPct,
    assumptionsTotal,
    edgesPct,
    scopeItems,
    questionsTotal,
    summaryPct,
  ];
  const filledSections = sections.filter(x => (typeof x === 'number' ? x > 0 : !!x)).length;
  return Math.round((filledSections / sections.length) * 100);
}

function getSectionCompletion(sectionId, analysis) {
  if (sectionId === "overview") {
    const o = analysis.overview;
    return !!(o.featureName || o.description || o.origin);
  }
  if (sectionId === "problem") {
    const p = analysis.problem;
    const count = [p.problem, p.who, p.outcome, p.metrics, p.ifNotBuilt].filter(Boolean).length;
    return Math.round((count / 5) * 100);
  }
  if (sectionId === "context") {
    const c = analysis.context;
    const count = [c.segments, c.workflow, c.workarounds, c.triggers, c.beforeAfter].filter(Boolean).length;
    return Math.round((count / 5) * 100);
  }
  if (sectionId === "assumptions") {
    return { isCount: true, value: analysis.assumptions.length };
  }
  if (sectionId === "edges") {
    const considered = EDGE_CASE_ITEMS.filter(item => analysis.edges[item.id]?.considered).length;
    return Math.round((considered / EDGE_CASE_ITEMS.length) * 100);
  }
  if (sectionId === "scope") {
    return { isCount: true, value: analysis.scope?.items?.length || 0 };
  }
  if (sectionId === "questions") {
    return { isCount: true, value: analysis.questions.length };
  }
  if (sectionId === "summary") {
    const s = analysis.summary;
    const count = [s.confidence, s.concerns, s.nextSteps].filter(Boolean).length;
    return Math.round((count / 3) * 100);
  }
  return 0;
}

const VersionBadge = ({ version }) => {
  if (!version) return null;
  const colors = VERSION_COLORS[version] || VERSION_COLORS.Future;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
      {version}
    </span>
  );
};

function App() {
  const [analyses, setAnalyses] = useState(() => {
    const saved = localStorage.getItem("requirementAnalyses");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.map(a => {
          if (!a.scope) a.scope = { affected: "", newPatterns: "", technical: "", items: [] };
          if (!a.scope.items) a.scope.items = [];
          return a;
        }) : [createBlankAnalysis()];
      } catch {
        return [createBlankAnalysis()];
      }
    }
    return [createBlankAnalysis()];
  });

  const [activeId, setActiveId] = useState(() => analyses[0]?.id);
  const [activeSection, setActiveSection] = useState("overview");
  const [phaseFilter, setPhaseFilter] = useState("All");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get("data");
    if (sharedData) {
      try {
        const decoded = JSON.parse(atob(sharedData));
        if (!decoded.scope) decoded.scope = { affected: "", newPatterns: "", technical: "", items: [] };
        if (!decoded.scope.items) decoded.scope.items = [];
        setAnalyses([decoded]);
        setActiveId(decoded.id);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("Failed to decode shared link:", err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("requirementAnalyses", JSON.stringify(analyses));
  }, [analyses]);

  const active = useMemo(() => analyses.find(a => a.id === activeId), [analyses, activeId]);

  const updateActive = useCallback((updater) => {
    setAnalyses(prev =>
      prev.map(a => {
        if (a.id !== activeId) return a;
        const updated = typeof updater === "function" ? updater(a) : { ...a, ...updater };
        updated.updatedAt = new Date().toISOString();
        return updated;
      })
    );
  }, [activeId]);

  const handleNewAnalysis = () => {
    const newA = createBlankAnalysis();
    setAnalyses(prev => [...prev, newA]);
    setActiveId(newA.id);
    setActiveSection("overview");
  };
  const handleDeleteAnalysis = (id) => {
    if (analyses.length <= 1) return;
    setAnalyses(prev => prev.filter(a => a.id !== id));
    if (id === activeId) setActiveId(analyses[0].id);
  };

  const exportToMarkdown = () => {
    if (!active) return "";
    const lines = [];
    lines.push(`# ${active.name || "Requirement Analysis"}\n`);
    lines.push(`**Phase:** ${active.phase || "N/A"}`);
    lines.push(`**Last Updated:** ${new Date(active.updatedAt).toLocaleDateString()}\n`);
    lines.push("---\n");
    lines.push("## Overview");
    lines.push(`**Feature Name:** ${active.overview.featureName}`);
    lines.push(`**Date:** ${active.overview.date}`);
    lines.push(`**Requestor:** ${active.overview.requestor}`);
    lines.push(`**Origin:** ${active.overview.origin}`);
    lines.push(`**Description:** ${active.overview.description}\n`);
    lines.push("## Problem & Purpose");
    lines.push(`**Problem:** ${active.problem.problem}`);
    lines.push(`**Who:** ${active.problem.who}`);
    lines.push(`**Desired Outcome:** ${active.problem.outcome}`);
    lines.push(`**Success Metrics:** ${active.problem.metrics}`);
    lines.push(`**If Not Built:** ${active.problem.ifNotBuilt}\n`);
    lines.push("## User Context");
    lines.push(`**User Segments:** ${active.context.segments}`);
    lines.push(`**Current Workflow:** ${active.context.workflow}`);
    lines.push(`**Existing Workarounds:** ${active.context.workarounds}`);
    lines.push(`**What Triggers This Need:** ${active.context.triggers}`);
    lines.push(`**Before/After:** ${active.context.beforeAfter}\n`);
    lines.push("## Assumptions");
    active.assumptions.forEach((a, i) => {
      lines.push(`${i + 1}. **${a.assumption}** (${a.status})`);
      if (a.validation) lines.push(`   - Validation: ${a.validation}`);
    });
    lines.push("");
    lines.push("## Edge Cases");
    EDGE_CASE_ITEMS.forEach(item => {
      const e = active.edges[item.id];
      if (e?.considered) {
        lines.push(`- **${item.label}:** ${e.notes || "Considered"}`);
      }
    });
    lines.push("");
    lines.push("## Scope & Versions");
    lines.push(`**Affected Areas:** ${active.scope.affected}`);
    lines.push(`**New Patterns:** ${active.scope.newPatterns}`);
    lines.push(`**Technical Considerations:** ${active.scope.technical}`);
    if (active.scope.items && active.scope.items.length > 0) {
      lines.push("\n### Scope Items");
      active.scope.items.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.item} [${item.version || "Untagged"}] [${item.priority}]`);
        if (item.description) lines.push(`   ${item.description}`);
      });
    }
    lines.push("");
    lines.push("## Open Questions");
    active.questions.forEach((q, i) => {
      lines.push(`${i + 1}. **${q.question}** (${q.type}) [${q.status}]`);
      if (q.answer) lines.push(`   - Answer: ${q.answer}`);
    });
    lines.push("");
    lines.push("## Summary");
    lines.push(`**Confidence Level:** ${active.summary.confidence}`);
    lines.push(`**Concerns/Risks:** ${active.summary.concerns}`);
    lines.push(`**Next Steps:** ${active.summary.nextSteps}`);
    return lines.join("\n");
  };

  const handleShareLink = () => {
    if (!active) return;
    const encoded = btoa(JSON.stringify(active));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Share link copied to clipboard!");
    });
  };

  const handleExport = () => {
    const md = exportToMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active?.name || "analysis"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCompletion = active ? getCompletion(active) : 0;

  const phaseCounts = useMemo(() => {
    const counts = { All: 0, Untagged: 0 };
    VERSION_PHASES.forEach(v => counts[v] = 0);
    if (!active?.scope?.items) return counts;
    active.scope.items.forEach(item => {
      counts.All++;
      if (!item.version) counts.Untagged++;
      else if (counts[item.version] !== undefined) counts[item.version]++;
    });
    return counts;
  }, [active]);

  if (!active) return <div className="p-4">Loading...</div>;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <aside className="w-64 bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold text-slate-100">Requirement Analyzer</h1>
          <button
            onClick={handleNewAnalysis}
            className="mt-3 w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm hover:bg-slate-600 font-medium"
          >
            + New Analysis
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {analyses.map(a => {
            const completion = getCompletion(a);
            return (
              <div
                key={a.id}
                className={`p-3 mb-2 rounded-md cursor-pointer group relative ${
                  a.id === activeId ? "bg-slate-700" : "hover:bg-slate-700/50"
                }`}
                onClick={() => setActiveId(a.id)}
              >
                <div className="text-sm font-medium text-slate-100 truncate">{a.name}</div>
                <div className="text-xs text-slate-400">{completion}% complete</div>
                {analyses.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAnalysis(a.id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-700 space-y-2">
          <button
            onClick={handleExport}
            className="w-full bg-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm hover:bg-slate-600 font-medium"
          >
            Export as Markdown
          </button>
          <button
            onClick={handleShareLink}
            className="w-full bg-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm hover:bg-slate-600 font-medium"
          >
            Export as JSON
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <input
            type="text"
            value={active.name}
            onChange={e => updateActive({ name: e.target.value })}
            className="text-xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
            placeholder="Analysis Name"
          />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400">
              {totalCompletion}%
            </span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <nav className="bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <div className="flex border-b border-gray-200">
              {SECTIONS.map(sec => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                      isActive 
                        ? "border-slate-900 text-slate-900" 
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span>{sec.icon}</span>
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>
            {activeSection === "scope" && active.scope?.items && active.scope.items.length > 0 && (
              <div className="px-4 py-4 bg-white border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Filter by Phase</h3>
                <div className="flex flex-wrap gap-2">
                  {["All", ...VERSION_PHASES, "Untagged"].map(phase => {
                    const colors = VERSION_COLORS[phase];
                    return (
                      <button
                        key={phase}
                        onClick={() => setPhaseFilter(phase)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                          phaseFilter === phase 
                            ? colors ? `${colors.bg} ${colors.text} ${colors.border} border` : "bg-slate-700 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span>{phase}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                          phaseFilter === phase ? "bg-white/20" : "bg-gray-200"
                        }`}>
                          {phaseCounts[phase] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          <main className="flex-1 overflow-y-auto p-8 bg-white">
            {activeSection === "overview" && <OverviewSection active={active} updateActive={updateActive} />}
            {activeSection === "problem" && <ProblemSection active={active} updateActive={updateActive} />}
            {activeSection === "context" && <ContextSection active={active} updateActive={updateActive} />}
            {activeSection === "assumptions" && <AssumptionsSection active={active} updateActive={updateActive} />}
            {activeSection === "edges" && <EdgesSection active={active} updateActive={updateActive} />}
            {activeSection === "scope" && <ScopeSection active={active} updateActive={updateActive} phaseFilter={phaseFilter} />}
            {activeSection === "questions" && <QuestionsSection active={active} updateActive={updateActive} />}
            {activeSection === "summary" && <SummarySection active={active} updateActive={updateActive} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewSection({ active, updateActive }) {
  const o = active.overview;
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Overview</h2>
        <p className="text-sm text-gray-500">Basic information about the feature requirement.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Feature Name</label>
          <input
            type="text"
            value={o.featureName}
            onChange={e => updateActive(a => ({ ...a, overview: { ...a.overview, featureName: e.target.value } }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input
            type="text"
            value={o.date}
            onChange={e => updateActive(a => ({ ...a, overview: { ...a.overview, date: e.target.value } }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Requestor / Source</label>
          <input
            type="text"
            value={o.requestor}
            onChange={e => updateActive(a => ({ ...a, overview: { ...a.overview, requestor: e.target.value } }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Requirement Origin</label>
          <select
            value={o.origin}
            onChange={e => updateActive(a => ({ ...a, overview: { ...a.overview, origin: e.target.value } }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          >
            <option value="">Select...</option>
            {ORIGIN_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Target Version</label>
        <p className="text-xs text-gray-500 mb-3">Which release phase is this analysis targeting?</p>
        <div className="flex flex-wrap gap-2">
          {VERSION_PHASES.map(phase => {
            const colors = VERSION_COLORS[phase];
            return (
              <button
                key={phase}
                onClick={() => updateActive(a => ({ ...a, phase }))}
                className={`px-4 py-2 rounded-md text-sm font-medium border ${
                  active.phase === phase
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {phase}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Brief Description</label>
        <p className="text-xs text-gray-500 mb-3">What is this feature in one or two sentences?</p>
        <textarea
          value={o.description}
          onChange={e => updateActive(a => ({ ...a, overview: { ...a.overview, description: e.target.value } }))}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
        />
      </div>
    </div>
  );
}

function ProblemSection({ active, updateActive }) {
  const p = active.problem;
  return (
    <div className="max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Problem & Purpose</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">What problem are we solving?</label>
        <textarea
          value={p.problem}
          onChange={e => updateActive(a => ({ ...a, problem: { ...a.problem, problem: e.target.value } }))}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">For whom?</label>
        <textarea
          value={p.who}
          onChange={e => updateActive(a => ({ ...a, problem: { ...a.problem, who: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Desired outcome</label>
        <textarea
          value={p.outcome}
          onChange={e => updateActive(a => ({ ...a, problem: { ...a.problem, outcome: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">How will we measure success?</label>
        <textarea
          value={p.metrics}
          onChange={e => updateActive(a => ({ ...a, problem: { ...a.problem, metrics: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">What happens if we don't build this?</label>
        <textarea
          value={p.ifNotBuilt}
          onChange={e => updateActive(a => ({ ...a, problem: { ...a.problem, ifNotBuilt: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function ContextSection({ active, updateActive }) {
  const c = active.context;
  return (
    <div className="max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">User Context</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Which user segments need this?</label>
        <textarea
          value={c.segments}
          onChange={e => updateActive(a => ({ ...a, context: { ...a.context, segments: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">What is their current workflow?</label>
        <textarea
          value={c.workflow}
          onChange={e => updateActive(a => ({ ...a, context: { ...a.context, workflow: e.target.value } }))}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Existing workarounds?</label>
        <textarea
          value={c.workarounds}
          onChange={e => updateActive(a => ({ ...a, context: { ...a.context, workarounds: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">What triggers this need?</label>
        <textarea
          value={c.triggers}
          onChange={e => updateActive(a => ({ ...a, context: { ...a.context, triggers: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Before vs After</label>
        <textarea
          value={c.beforeAfter}
          onChange={e => updateActive(a => ({ ...a, context: { ...a.context, beforeAfter: e.target.value } }))}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          placeholder="Before: ...\nAfter: ..."
        />
      </div>
    </div>
  );
}

function AssumptionsSection({ active, updateActive }) {
  const addAssumption = () => {
    updateActive(a => ({
      ...a,
      assumptions: [...a.assumptions, { id: generateId(), assumption: "", status: "Unvalidated", validation: "" }],
    }));
  };
  const removeAssumption = (id) => {
    updateActive(a => ({ ...a, assumptions: a.assumptions.filter(x => x.id !== id) }));
  };
  const updateAssumption = (id, field, value) => {
    updateActive(a => ({
      ...a,
      assumptions: a.assumptions.map(x => (x.id === id ? { ...x, [field]: value } : x)),
    }));
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Assumptions</h2>
        <button
          onClick={addAssumption}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"
        >
          + Add Assumption
        </button>
      </div>
      {active.assumptions.length === 0 && (
        <p className="text-gray-500 text-sm">No assumptions yet. Click "Add Assumption" to get started.</p>
      )}
      {active.assumptions.map((a, idx) => (
        <div key={a.id} className="border border-gray-200 rounded p-4 space-y-3 bg-white">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-gray-500">Assumption #{idx + 1}</span>
            <button onClick={() => removeAssumption(a.id)} className="text-red-500 hover:text-red-700 text-sm">
              Remove
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What are we assuming?</label>
            <textarea
              value={a.assumption}
              onChange={e => updateAssumption(a.id, "assumption", e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={a.status}
              onChange={e => updateAssumption(a.id, "status", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              {ASSUMPTION_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">How to validate / findings</label>
            <textarea
              value={a.validation}
              onChange={e => updateAssumption(a.id, "validation", e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EdgesSection({ active, updateActive }) {
  const toggleEdge = (id) => {
    updateActive(a => ({
      ...a,
      edges: { ...a.edges, [id]: { ...a.edges[id], considered: !a.edges[id]?.considered } },
    }));
  };
  const updateEdgeNotes = (id, notes) => {
    updateActive(a => ({
      ...a,
      edges: { ...a.edges, [id]: { ...a.edges[id], notes } },
    }));
  };

  return (
    <div className="max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Edge Cases</h2>
      {EDGE_CASE_ITEMS.map(item => {
        const e = active.edges[item.id] || { considered: false, notes: "" };
        return (
          <div key={item.id} className="border border-gray-200 rounded p-4 bg-white">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={e.considered}
                onChange={() => toggleEdge(item.id)}
                className="mt-1 h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-900">{item.label}</label>
                <p className="text-xs text-gray-500 mb-2">{item.hint}</p>
                {e.considered && (
                  <textarea
                    value={e.notes}
                    onChange={e => updateEdgeNotes(item.id, e.target.value)}
                    rows={2}
                    placeholder="Notes on how you'll handle this..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScopeSection({ active, updateActive, phaseFilter }) {
  const [viewMode, setViewMode] = useState("list");

  const addScopeItem = () => {
    updateActive(a => ({
      ...a,
      scope: {
        ...a.scope,
        items: [...(a.scope.items || []), { id: generateId(), item: "", description: "", version: "", priority: "Must" }],
      },
    }));
  };
  const removeScopeItem = (id) => {
    updateActive(a => ({
      ...a,
      scope: { ...a.scope, items: a.scope.items.filter(x => x.id !== id) },
    }));
  };
  const updateScopeItem = (id, field, value) => {
    updateActive(a => ({
      ...a,
      scope: {
        ...a.scope,
        items: a.scope.items.map(x => (x.id === id ? { ...x, [field]: value } : x)),
      },
    }));
  };

  const filteredItems = useMemo(() => {
    const items = active.scope?.items || [];
    if (phaseFilter === "All") return items;
    if (phaseFilter === "Untagged") return items.filter(i => !i.version);
    return items.filter(i => i.version === phaseFilter);
  }, [active.scope?.items, phaseFilter]);

  const versionGroups = useMemo(() => {
    const items = active.scope?.items || [];
    const groups = { Untagged: [] };
    VERSION_PHASES.forEach(v => groups[v] = []);
    items.forEach(item => {
      if (!item.version) groups.Untagged.push(item);
      else if (groups[item.version]) groups[item.version].push(item);
      else groups.Untagged.push(item);
    });
    return groups;
  }, [active.scope?.items]);

  const versionCounts = useMemo(() => {
    const items = active.scope?.items || [];
    const counts = { Untagged: 0 };
    VERSION_PHASES.forEach(v => counts[v] = 0);
    items.forEach(item => {
      if (!item.version) counts.Untagged++;
      else if (counts[item.version] !== undefined) counts[item.version]++;
    });
    return counts;
  }, [active.scope?.items]);

  const totalItems = active.scope?.items?.length || 0;

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Scope & Versions</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode("versions")}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === "versions" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            Version View
          </button>
          <button
            onClick={addScopeItem}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"
          >
            + Add Item
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Affected areas</label>
        <textarea
          value={active.scope.affected}
          onChange={e => updateActive(a => ({ ...a, scope: { ...a.scope, affected: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          placeholder="Which surfaces, components, or flows?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New UI patterns or components</label>
        <textarea
          value={active.scope.newPatterns}
          onChange={e => updateActive(a => ({ ...a, scope: { ...a.scope, newPatterns: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Technical notes</label>
        <textarea
          value={active.scope.technical}
          onChange={e => updateActive(a => ({ ...a, scope: { ...a.scope, technical: e.target.value } }))}
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          placeholder="APIs, dependencies, performance considerations"
        />
      </div>

      {totalItems > 0 && viewMode === "list" && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Scope Items {phaseFilter !== "All" && <span className="text-sm font-normal text-gray-600">(Filtered: {phaseFilter})</span>}
          </h3>
          <div className="flex items-center gap-2 h-4 rounded-full overflow-hidden bg-gray-200 mb-4">
            {VERSION_PHASES.map(version => {
              const count = versionCounts[version] || 0;
              if (count === 0) return null;
              const width = (count / totalItems) * 100;
              const colors = VERSION_COLORS[version];
              return (
                <div
                  key={version}
                  className={`h-full ${colors.dot}`}
                  style={{ width: `${width}%` }}
                  title={`${version}: ${count} items`}
                />
              );
            })}
            {versionCounts.Untagged > 0 && (
              <div
                className="h-full bg-gray-400"
                style={{ width: `${(versionCounts.Untagged / totalItems) * 100}%` }}
                title={`Untagged: ${versionCounts.Untagged} items`}
              />
            )}
          </div>
          {filteredItems.length === 0 && phaseFilter !== "All" && (
            <p className="text-sm text-gray-500">No items in this phase.</p>
          )}
          {filteredItems.map((item, idx) => (
            <div key={item.id} className="border border-gray-200 rounded p-4 mb-3 bg-white space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-gray-500">Item #{idx + 1}</span>
                <button onClick={() => removeScopeItem(item.id)} className="text-red-500 hover:text-red-700 text-sm">
                  Remove
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                <input
                  type="text"
                  value={item.item}
                  onChange={e => updateScopeItem(item.id, "item", e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Add export button to dashboard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={item.description}
                  onChange={e => updateScopeItem(item.id, "description", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional context..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <select
                    value={item.version}
                    onChange={e => updateScopeItem(item.id, "version", e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Untagged</option>
                    {VERSION_PHASES.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={item.priority}
                    onChange={e => updateScopeItem(item.id, "priority", e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    {PRIORITY_LEVELS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalItems > 0 && viewMode === "versions" && (
        <div className="mt-6 border-t border-gray-200 pt-4 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Items by Version</h3>
          <div className="flex items-center gap-2 h-4 rounded-full overflow-hidden bg-gray-200 mb-4">
            {VERSION_PHASES.map(version => {
              const count = versionCounts[version] || 0;
              if (count === 0) return null;
              const width = (count / totalItems) * 100;
              const colors = VERSION_COLORS[version];
              return (
                <div
                  key={version}
                  className={`h-full ${colors.dot}`}
                  style={{ width: `${width}%` }}
                  title={`${version}: ${count} items`}
                />
              );
            })}
            {versionCounts.Untagged > 0 && (
              <div
                className="h-full bg-gray-400"
                style={{ width: `${(versionCounts.Untagged / totalItems) * 100}%` }}
                title={`Untagged: ${versionCounts.Untagged} items`}
              />
            )}
          </div>
          {[...VERSION_PHASES, "Untagged"].map(version => {
            const items = versionGroups[version] || [];
            if (items.length === 0) return null;
            const colors = VERSION_COLORS[version] || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" };
            return (
              <div key={version} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold px-3 py-1 rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
                    {version}
                  </h4>
                  <span className="text-sm text-gray-500">({items.length})</span>
                </div>
                {items.map(item => (
                  <div key={item.id} className="ml-4 border border-gray-200 rounded p-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{item.item || "Untitled"}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{item.priority}</span>
                        </div>
                        {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                      </div>
                      <button onClick={() => removeScopeItem(item.id)} className="text-red-500 hover:text-red-700 text-xs ml-2">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestionsSection({ active, updateActive }) {
  const addQuestion = () => {
    updateActive(a => ({
      ...a,
      questions: [
        ...a.questions,
        { id: generateId(), question: "", type: "Can Answer Now", status: "Open", answer: "" },
      ],
    }));
  };
  const removeQuestion = (id) => {
    updateActive(a => ({ ...a, questions: a.questions.filter(x => x.id !== id) }));
  };
  const updateQuestion = (id, field, value) => {
    updateActive(a => ({
      ...a,
      questions: a.questions.map(x => (x.id === id ? { ...x, [field]: value } : x)),
    }));
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Open Questions</h2>
        <button
          onClick={addQuestion}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"
        >
          + Add Question
        </button>
      </div>
      {active.questions.length === 0 && (
        <p className="text-gray-500 text-sm">No questions yet.</p>
      )}
      {active.questions.map((q, idx) => (
        <div key={q.id} className="border border-gray-200 rounded p-4 space-y-3 bg-white">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-gray-500">Question #{idx + 1}</span>
            <button onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 text-sm">
              Remove
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <textarea
              value={q.question}
              onChange={e => updateQuestion(q.id, "question", e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={q.type}
                onChange={e => updateQuestion(q.id, "type", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                {QUESTION_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={q.status}
                onChange={e => updateQuestion(q.id, "status", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                {QUESTION_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {q.status === "Answered" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
              <textarea
                value={q.answer}
                onChange={e => updateQuestion(q.id, "answer", e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SummarySection({ active, updateActive }) {
  const s = active.summary;
  return (
    <div className="max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Summary</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confidence level</label>
        <div className="flex gap-2">
          {CONFIDENCE_LEVELS.map(lv => (
            <button
              key={lv}
              onClick={() => updateActive(a => ({ ...a, summary: { ...a.summary, confidence: lv } }))}
              className={`px-4 py-2 rounded text-sm border ${
                s.confidence === lv
                  ? "bg-indigo-100 text-indigo-700 border-indigo-300 font-medium"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Concerns or risks</label>
        <textarea
          value={s.concerns}
          onChange={e => updateActive(a => ({ ...a, summary: { ...a.summary, concerns: e.target.value } }))}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Next steps</label>
        <textarea
          value={s.nextSteps}
          onChange={e => updateActive(a => ({ ...a, summary: { ...a.summary, nextSteps: e.target.value } }))}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

export default App;
