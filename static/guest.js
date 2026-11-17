const guestData = fetch("./static/content.json").then(response => {
  if (!response.ok) throw new Error("Academy content could not be loaded.");
  return response.json();
});
const guestKey = "neurosphere-guest-progress-v1";
let guestProgress = {attempts: [], mocks: []};
try {
  const saved = JSON.parse(localStorage.getItem(guestKey));
  if (Array.isArray(saved?.attempts) && Array.isArray(saved?.mocks)) guestProgress = saved;
} catch {}

function saveGuestProgress() {
  try { localStorage.setItem(guestKey, JSON.stringify(guestProgress)); } catch {}
}

async function api(path, options = {}) {
  const {pathname, searchParams: params} = new URL(path, location.origin);
  const language = params.get("lang") === "de" ? "de" : "en";
  if (pathname === "/api/auth/me") {
    return {display_name: lang === "de" ? "Gast" : "Guest", email: ""};
  }
  const {questions, topics, flashcards, anatomy} = (await guestData)[language];
  const questionById = new Map(questions.map(question => [question.id, question]));
  const {attempts, mocks} = guestProgress;
  const payload = options.body ? JSON.parse(options.body) : {};
  const percent = (correct, total) => total ? Math.round(100 * correct / total) : 0;
  const pilot = params.get("pilot") === "true";
  const pool = pilot ? questions.filter(question => question.kind) : questions;

  switch (pathname) {
    case "/api/anatomy": {
      const latest = new Map(attempts.map(attempt => [attempt.id, attempt.correct]));
      const sections = anatomy.sections.map(section => {
        const stages = section.stages.map(stage => latest.has(stage.question_id)
          ? {...stage, status: latest.get(stage.question_id) ? "correct" : "review"}
          : stage);
        return {...section, stages,
          attempted: stages.filter(stage => latest.has(stage.question_id)).length,
          correct: stages.filter(stage => stage.status === "correct").length,
        };
      });
      return {...anatomy, sections};
    }
    case "/api/questions":
      return pool.filter(q => ["subspecialty", "topic", "kind", "section"].every(
        key => !params.get(key) || params.get(key) === q[key]));
    case "/api/topics": return topics;
    case "/api/flashcards": return flashcards;
    case "/api/attempts": {
      const question = questionById.get(payload.question_id);
      if (!question || !Object.hasOwn(question.options, payload.selected_option)) {
        throw new Error("Choose a valid answer.");
      }
      const correct = question.correct === payload.selected_option;
      attempts.push({id: question.id, correct});
      saveGuestProgress();
      return {is_correct: correct, correct_option: question.correct};
    }
    case "/api/dashboard": {
      const byArea = new Map();
      let correct = 0;
      for (const attempt of attempts) {
        if (attempt.correct) correct++;
        const area = questionById.get(attempt.id)?.subspecialty;
        if (!area) continue;
        const counts = byArea.get(area) || {attempted: 0, correct: 0};
        counts.attempted++;
        if (attempt.correct) counts.correct++;
        byArea.set(area, counts);
      }
      const weak_areas = [...byArea].map(([subspecialty, counts]) => ({
        subspecialty, accuracy: percent(counts.correct, counts.attempted),
      })).sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);
      return {display_name: lang === "de" ? "Gast" : "Guest", weak_areas,
        attempted: attempts.length, correct, incorrect_count: attempts.length - correct,
        accuracy: percent(correct, attempts.length),
      };
    }
    case "/api/review/incorrect":
      return [...new Set(attempts.slice().reverse().filter(a => !a.correct).map(a => a.id))]
        .map(id => questionById.get(id)).filter(Boolean);
    case "/api/mock/history": return mocks.slice().reverse();
    case "/api/mock/questions": {
      const shuffled = pool.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const selected = shuffled.slice(0, 5);
      return {questions: selected, question_ids: selected.map(q => q.id)};
    }
    case "/api/mock/submit": {
      const total = payload.question_ids.length;
      const score = payload.question_ids.filter(id => questionById.get(id)?.correct === payload.answers[id]).length;
      const run = {total, score, accuracy: percent(score, total), duration_seconds: payload.duration_seconds};
      mocks.push(run);
      saveGuestProgress();
      return run;
    }
  }
  const question = questionById.get(pathname.split("/").pop());
  if (pathname.startsWith("/api/questions/") && question) return question;
  throw new Error("This page could not be loaded.");
}

