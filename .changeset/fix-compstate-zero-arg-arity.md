---
"ultra-light-js": patch
---

`UltraCompStateResult<T>` now correctly types comp methods that take no extra arguments (e.g. `(comp) => void`) as `() => R` instead of `<A>(arg: A) => R`. Previously, parameter-count leniency in function-type assignability let zero-arg handlers accidentally match the generic single-arg branch, forcing a spurious required argument and breaking `tsc --strict` assignment against hand-written interfaces that correctly declare them as zero-arg. Fixed arity discrimination now checks the extracted argument tuple before deciding between the zero-arg, fixed-arg, generic-arg, and multi-arg cases; the existing generic-argument-preservation behavior from the previous fix is unchanged.
