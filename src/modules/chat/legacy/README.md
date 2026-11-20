# Legacy prototype chat logic

`questions.ts`, `scoring.ts` and `careers.ts` are the prototype's aptitude, values, percentile and % fit logic.
The demo UI under `src/components/discover/` still reads them until `/discover` is ported to the new backend.
**Do not extend them.** The real implementation is in the files one level up (`question-set.ts`, `scoring.ts`, ...).
Delete this folder when the discovery UI is ported (chat spec, "Cleanup").
