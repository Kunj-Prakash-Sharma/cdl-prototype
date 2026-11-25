# Legacy prototype chat logic

`questions.ts`, `scoring.ts` and `careers.ts` are the prototype's aptitude, values, percentile and % fit logic.
`/discover` no longer uses them. They are still read by the screens not yet ported to the backend: the
"Recommended for you" block on `/learn` (`learn/course-catalog.tsx`), the course page, My Learning and `lib/store.ts`
(V5 rows 9 and 10).
**Do not extend them.** The real implementation is in the files one level up (`question-set.ts`, `scoring.ts`, ...).
Delete this folder when those screens move to the real catalog and commerce modules.
