const ANATOMY_I18N = {
  en: {
    anatomy: "Anatomy curriculum", anatomyIntro: "Chapter 1 · 20 reading sections",
    notes: "Teaching notes", learningObjective: "Learning objective", nextCoverage: "Planned coverage",
    starter: "Five progressive revision questions", plannedPractice: "Practice planned", anatomyProgress: "Revision questions",
    anatomyAttempted: "attempted", anatomyCorrect: "correct on latest attempt", anatomyRead: "Textbook reading",
    foundation: "Foundation", conceptual: "Conceptual understanding", advanced: "Advanced integration",
    anatomyClinical: "Simple application", unattempted: "Ready", review: "Revisit", readingPage: "Printed pp.",
    anatomyBack: "All sections", anatomyStart: "Practise section", anatomyCoverage: "sections with practice",
  },
  de: {
    anatomy: "Lehrplan Anatomie", anatomyIntro: "Kapitel 1 · 20 Leseabschnitte",
    notes: "Lerntext", learningObjective: "Lernziel", nextCoverage: "Geplante Vertiefung",
    starter: "Fünf aufbauende Wiederholungsfragen", plannedPractice: "Übungen geplant", anatomyProgress: "Wiederholungsfragen",
    anatomyAttempted: "bearbeitet", anatomyCorrect: "zuletzt richtig", anatomyRead: "Lektüre im Lehrbuch",
    foundation: "Grundlagen", conceptual: "Zusammenhänge", advanced: "Vertiefung",
    anatomyClinical: "Einfache Anwendung", unattempted: "Bereit", review: "Wiederholen", readingPage: "Buchseiten",
    anatomyBack: "Alle Abschnitte", anatomyStart: "Abschnitt üben", anatomyCoverage: "Abschnitte mit Übungen",
  },
};

function stageTitle(stage) {
  return t(stage === "clinical" ? "anatomyClinical" : stage);
}

function sectionProgress(section) {
  return section.available
    ? `${section.attempted}/${section.available} ${t("anatomyAttempted")} · ${section.correct} ${t("anatomyCorrect")}`
    : t("plannedPractice");
}

async function renderAnatomy(container) {
  const requestedLanguage = lang;
  const {sections, book_url} = await api("/api/anatomy?lang=" + requestedLanguage);
  if (view !== "anatomy" || lang !== requestedLanguage) return;

  const selectedSection = sections.find(section => section.id === anatomySection);
  if (selectedSection) {
    renderAnatomySection(container, selectedSection, book_url);
    return;
  }

  const available = sections.filter(section => section.available).length;
  container.innerHTML = pageHead(t("anatomy"), t("anatomyIntro")) +
    `<p class="muted">${available}/${sections.length} ${t("anatomyCoverage")}</p>
    <div class="grid topic-grid">${sections.map(section => `
      <button class="topic-card" data-anatomy-section="${esc(section.id)}">
        <span class="pill">${section.number} · ${t("readingPage")} ${section.page_start}–${section.page_end}</span>
        <h3>${esc(section.title)}</h3>
        <p>${esc(section.objective)}</p>
        <small class="muted">${sectionProgress(section)}</small>
      </button>`).join("")}</div>`;
  container.querySelectorAll("[data-anatomy-section]").forEach(button => {
    button.onclick = () => {
      anatomySection = button.dataset.anatomySection;
      renderView();
    };
  });
}

function renderAnatomySection(container, section, bookUrl) {
  const {id, number, title, objective, planned_objective, notes, stages, status, reading, available} = section;
  container.innerHTML = pageHead(`${number}. ${esc(title)}`, t("anatomyIntro")) +
    `<article class="panel topic-detail">
      <button class="text-link" id="anatomy-back">← ${t("anatomyBack")}</button>
      <section class="topic-section"><h2>${t("learningObjective")}</h2><p>${esc(objective)}</p></section>
      <section class="topic-section"><h2>${t("notes")}</h2>${notes.map(note => `<p>${esc(note)}</p>`).join("")}</section>
      <section class="topic-section"><h2>${t("anatomyRead")}</h2><p><a href="${esc(bookUrl)}">${esc(reading)}</a></p></section>
      <section class="topic-section">
        <h2>${t("anatomyProgress")}</h2><p>${t(status === "starter" ? "starter" : "plannedPractice")}</p>
        ${available ? `<p>${sectionProgress(section)}</p>` : ""}
        <ol class="anatomy-stages">${stages.map(stage => `
          <li><span>${stageTitle(stage.id)}</span>
            ${stage.question_id
              ? `<button class="ghost" data-anatomy-question="${esc(stage.question_id)}">${t(stage.status)}</button>`
              : `<span class="muted">${t("plannedPractice")}</span>`}
          </li>`).join("")}</ol>
        ${available ? `<button class="primary" id="anatomy-practice">${t("anatomyStart")}</button>` : ""}
      </section>
      <section class="topic-section"><h2>${t("nextCoverage")}</h2><p>${esc(planned_objective)}</p></section>
      <p class="notice">${t("expertReview")}</p>
    </article>`;
  $("#anatomy-back").onclick = () => {
    anatomySection = null;
    renderView();
  };
  if (available) {
    $("#anatomy-practice").onclick = () => startPractice("Neuroanatomy", {section: id, revision: "true"});
    container.querySelectorAll("[data-anatomy-question]").forEach(button => {
      button.onclick = () => {
        questionSet = [{id: button.dataset.anatomyQuestion}];
        questionIndex = 0;
        showQuestion();
      };
    });
  }
}

