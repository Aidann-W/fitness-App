# Workout generation quiz

Build on PR 8. Generate one beginner/intermediate strength workout, not a weekly plan. Nutrition is excluded. Quiz answers exist only in component memory for this generation; closing resets them. Send answers to the existing Gemini endpoint, with a notice before submission. The resulting workout follows existing saving behavior.

Six steps: specific goal/deadline and focus; experience/history/performance; realistic weekly availability/session length/constraints; equipment/environment; limitations/sleep/stress; preferences and optional basic stats. All extra personal fields are optional. Finish with an editable review via Back or per-section edit. Existing goal, experience, duration and equipment defaults keep the flow fast. Skip quiz opens the existing form and excludes personal quiz fields from generation.

Use the existing accessible modal, Back/Next controls, focus on each step heading, a labeled progress bar, short opacity/transform transitions, and reduced-motion support. Prevent double submissions, retain answers on failure, permit retry, and keep cancellation available outside pending requests. Explain workout choices without repeating private details in the saved workout. No diagnosis, rehabilitation or nutrition advice.

Also rename the Dashboard heading and add a red Finish workout action on the final exercise, sharing current finish/save guards. When every set is complete, retain the last exercise so this action remains visible.

Acceptance: quiz and skip paths both generate through the existing API; all six steps and review support Back; custom equipment/exercises reach Gemini; personal fields never enter browser/database profile storage; finish action honors unsaved-set protection; desktop/mobile layout and production build pass. Live Gemini checks depend on a working signed-in session and API access.
