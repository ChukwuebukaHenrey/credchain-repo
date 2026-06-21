// ─────────────────────────────────────────────────────────────
// CredChain Frontend — AiTools (Week 3)
// Triggers CV generation and skills analysis through the backend proxy
// using the existing generateCV() / analyzeSkills() wrappers.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { generateCV, analyzeSkills } from '../services/api';

function toList(csv) {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AiTools() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    summary: '',
    skills: '',
    bio: '',
    goals: '',
  });

  const [cvLoading, setCvLoading] = useState(false);
  const [cvResult, setCvResult] = useState(null); // { message, downloadUrl, filename }
  const [cvError, setCvError] = useState(null);

  const [skillsLoading, setSkillsLoading] = useState(false);
  const [insights, setInsights] = useState(null); // { strong_skills, career_paths, next_steps }
  const [skillsError, setSkillsError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleGenerateCV() {
    setCvLoading(true);
    setCvError(null);
    setCvResult(null);
    try {
      const res = await generateCV({
        name: form.name,
        email: form.email,
        summary: form.summary,
        skills: toList(form.skills),
        experience: [],
        education: [],
      });

      // Backend proxy wraps the engine receipt under `data`.
      const receipt = res?.data || res;
      let downloadUrl = null;
      if (receipt?.pdf_base64) {
        downloadUrl = `data:application/pdf;base64,${receipt.pdf_base64}`;
      }

      setCvResult({
        message: receipt?.message || 'CV generated.',
        downloadUrl,
        filename: receipt?.filename || 'credchain-cv.pdf',
      });
    } catch (error) {
      console.error('[AiTools] generateCV failed', error);
      setCvError(
        error?.response?.data?.message || 'CV generation failed. Is the CV engine running?'
      );
    } finally {
      setCvLoading(false);
    }
  }

  async function handleAnalyzeSkills() {
    setSkillsLoading(true);
    setSkillsError(null);
    setInsights(null);
    try {
      const res = await analyzeSkills({
        skills: toList(form.skills),
        bio: form.bio,
        goals: form.goals,
      });
      const data = res?.data || res;
      setInsights({
        strong_skills: data?.strong_skills || [],
        career_paths: data?.career_paths || [],
        next_steps: data?.next_steps || [],
      });
    } catch (error) {
      console.error('[AiTools] analyzeSkills failed', error);
      setSkillsError(
        error?.response?.data?.message || 'Skill analysis failed. Is the insights engine running?'
      );
    } finally {
      setSkillsLoading(false);
    }
  }

  const inputClass =
    'rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-credchain-primary focus:outline-none focus:ring-2 focus:ring-credchain-primary';

  return (
    <section className="w-full max-w-2xl rounded-2xl bg-slate-800/60 p-6 shadow-xl ring-1 ring-slate-700">
      <h2 className="mb-4 text-xl font-bold text-credchain-primary">AI Tools</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className={inputClass} name="name" placeholder="Full name" value={form.name} onChange={handleChange} />
        <input className={inputClass} name="email" placeholder="Email" value={form.email} onChange={handleChange} />
        <input
          className={`${inputClass} sm:col-span-2`}
          name="skills"
          placeholder="Skills (comma-separated, e.g. React, Solana)"
          value={form.skills}
          onChange={handleChange}
        />
        <textarea
          className={`${inputClass} sm:col-span-2`}
          name="summary"
          placeholder="CV summary"
          rows={2}
          value={form.summary}
          onChange={handleChange}
        />
        <input className={inputClass} name="bio" placeholder="Short bio (for insights)" value={form.bio} onChange={handleChange} />
        <input className={inputClass} name="goals" placeholder="Career goals (for insights)" value={form.goals} onChange={handleChange} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerateCV}
          disabled={cvLoading}
          className="rounded-lg bg-credchain-primary px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {cvLoading ? 'Generating…' : 'Generate CV'}
        </button>
        <button
          type="button"
          onClick={handleAnalyzeSkills}
          disabled={skillsLoading}
          className="rounded-lg bg-credchain-accent px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90 disabled:opacity-50"
        >
          {skillsLoading ? 'Analyzing…' : 'Analyze My Skills'}
        </button>
      </div>

      {/* CV result */}
      {cvError && <p className="mt-3 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-300">{cvError}</p>}
      {cvResult && (
        <div className="mt-3 rounded-lg bg-emerald-900/40 px-3 py-2 text-sm text-emerald-300">
          <p>{cvResult.message}</p>
          {cvResult.downloadUrl && (
            <a
              href={cvResult.downloadUrl}
              download={cvResult.filename}
              className="mt-1 inline-block font-semibold text-emerald-200 underline"
            >
              Download {cvResult.filename}
            </a>
          )}
        </div>
      )}

      {/* Insights result */}
      {skillsError && <p className="mt-3 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-300">{skillsError}</p>}
      {insights && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InsightCard title="Strong Skills" items={insights.strong_skills} />
          <InsightCard title="Career Paths" items={insights.career_paths} />
          <InsightCard title="Next Steps" items={insights.next_steps} />
        </div>
      )}
    </section>
  );
}

function InsightCard({ title, items }) {
  return (
    <div className="rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-700">
      <h3 className="mb-2 text-sm font-bold text-credchain-accent">{title}</h3>
      {items && items.length > 0 ? (
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-200">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No suggestions yet (set OPENAI_API_KEY for real insights).</p>
      )}
    </div>
  );
}
