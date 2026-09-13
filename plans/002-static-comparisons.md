# Plan 002: Sabit string değerlerini bütün karşılaştırma biçimlerinde denetle

Öncelik P1 · Efor M · Risk MED · Kategori bug · Önerilen sıra: 001 sonrası; algoritmik bağımlılık yok.

## Başlangıç ve yetki

Bu plan bağımsız uygulanmak üzere yazılmıştır. Çalışma dizini: `/Users/mert/Projeler/Mert/eslint/eslint-plugin-next-routing`.
Planlama tabanı: **2d1536b**, 2026-09-12; yalnız commit değil mevcut çalışma ağacı da tabandır.
Başlarken `git status --short`, `git diff --stat 2d1536b..HEAD` ve `git diff -- lib rules README.md package.json` çalıştır; aşağıdaki alıntıları canlı kodla karşılaştır.
Önceki çalışmadan README.md, BENCHMARKS.md, lib/navigationReporter.js, lib/routeCompareReporter.js, lib/routeEvaluation.js, lib/ruleContext.js, scripts/benchmark.js değişik; tests/rules/benchmark.test.js ve tests/rules/routeEvaluation.test.js yeni dosyalardır.
Bu değişiklikleri koru. Salt 2d1536b checkout'u, indeks ve benchmark düzeltmelerini içermez. Beklenmeyen fark varsa etkilenen adımı durdur.

Bu belge planlama çıktısıdır; uygulama için ayrı kullanıcı talimatını bekle. Uygulama yetkisi verilince yalnız belirtilen dosyalarda çalış. Stage, commit, push, yayınlama ve sürüm yükseltme yetkisi yoktur. Yeni branch adı uydurma.

## Ortam ve temel doğrulama

CommonJS JavaScript, Mocha ve ESLint RuleTester kullanılıyor; bağımlılık kilidi bun.lock.
Mevcut yerel ortam Node 22.22.2 / ESLint 9.39.4; başlangıçta **173 test geçti**.
CI Node 18/20 × ESLint 8/9 çalıştırıyor; bu matrisin tamamı yerelde doğrulanmış değildir.
Mevcut paket betiklerinde lint veya typecheck komutu yoktur; varmış gibi raporlama.
Bağımlılıklar mevcutsa yeniden kurma. Eksikse bun.lock ile uyumlu `bun install --frozen-lockfile` kullan; kilit değiştirme ihtiyacını ayrıca değerlendir.

| Amaç | Komut | Beklenen |
| --- | --- | --- |
| Başlangıç / son regresyon | `npm test -- --reporter dot` | exit 0; başlangıç testleri ve yeni testler geçer |
| Diff kontrolü | `git diff --check` | exit 0 |
| Değişen JS dosyası | `node --check DOSYA` | exit 0; DOSYA yerine gerçek dosyayı yaz |
| Kapsam | `git status --short` ve `git diff --stat` | başlangıç farklarına yalnız plan kapsamı eklenir |

Testlerde tests/rules/ruleTesterCompat.js içindeki `createRuleTester({ jsx: true })` biçimini kullan; ESLint 8/9 farkını bu yardımcı zaten ele alır.
Yeni davranış testini önce ekle, ilgili hatayla başarısız olduğunu kaydet; sonra uygulayıp aynı testi geçir.
Bitişte plans/README.md satırına durum ve doğrulama kanıtı ekle; başarısız/çalıştırılmamış kontrolü başarılı sayma.

## Amaç ve mevcut durum

`const target = '/missing'; router.route === target` şu anda uyarı üretmez; literal karşılığı üretir.
Navigasyon kuralı sabitleri zaten çözüyor. Aynı yerel çözümleyiciyi kullan; ikinci bir evaluator yazma.

- rules/no-invalid-route-compare.js, getRouteStringLiteral:
  `if (!isStringLiteral(node)) { return null; }`
- Aynı dosyada equality, includes döngüleri ve switch case.test literal kontrolleri var; hepsi kapsamda.
- rules/no-invalid-router-navigation.js, createStaticIdentifierResolver: scopeManager referanslarını WeakMap ile indeksler; yalnız tek tanımlı const init'lerini çözer, döngüleri resolvingVariables ile keser.
- lib/ast.js, getStaticStringValue: Literal, TemplateLiteral ve Identifier destekler; bilinmeyene null döner.
- lib/suggestions.js, buildSuggestionFix yalnız literal ve ifadesiz template değiştirir; Identifier için fix üretmez. Bu güvenlik davranışı korunmalı.

## Kapsam

rules/no-invalid-route-compare.js, rules/no-invalid-router-navigation.js (çözümleyiciyi paylaşmak için), yeni lib/staticStrings.js, lib/ast.js (yalnız gerekirse aynı çözümleme sınırı), tests/rules/no-invalid-route-compare.test.js, tests/rules/no-invalid-router-navigation.test.js, yeni tests/rules/staticStrings.test.js, README.md (destek sınırı), plans/README.md.
Router kimliği, Link nesne pathname desteğini genişletme, cross-file import çözümleme, runtime çalıştırma, tüm array değişkenlerini değerlendirme, sayfa tarama ve cache politikası kapsam dışıdır.

## Adımlar

1. **Regresyonları yaz.** Mevcut RuleTester yapısını kullan:
   `const target = '/missing'; router.route === target` → invalidRouteCompare.
   Equality ters operand, !=/!==, route/pathname/asPath, `[target].includes(router.route)`, switch case target ve statik string template de kapsansın.
   **Kontrol:** `npx --no-install mocha tests/rules/no-invalid-route-compare.test.js` → yeni bilinen-string senaryoları uyarı eksikliğiyle başarısız; önceki testler korunur.
2. **Mevcut resolver'ı taşı.** createStaticIdentifierResolver'ı lib/staticStrings.js içine çıkar; navigation aynı fonksiyonu import etsin. Per-rule/per-file cache, lazy başlangıç ve cycle guard korunur. lib/ast.js getStaticStringValue sahibi olarak kalır.
   **Kontrol:** `npx --no-install mocha tests/rules/no-invalid-router-navigation.test.js tests/rules/ast.test.js` → tümü geçer; karşılaştırma regresyonlarının henüz başarısız olması beklenir.
3. **Karşılaştırma yoluna bağla.** create(context) içinde sourceCode uyumlu erişimini kullan. Equality'nin iki tarafını, includes değer toplama/raporlama döngülerini ve switch testlerini aynı resolver ile çöz. Başlangıç '/' filtresi ve normalizeTrailingSlash ile includes öneri hariç tutma davranışı korunsun. Raporu kullanım düğümüne bağla; const tanımını veya diğer kullanım yerlerini değiştirme.
   **Kontrol:** `npx --no-install mocha tests/rules/no-invalid-route-compare.test.js tests/rules/staticStrings.test.js` → exit 0.
4. **Belirsizlik sınırlarını test et.** Let/var, fonksiyon sonucu, import, parametre, non-string, bilinmeyen interpolation ve cyclic const alias için yeni tahmini uyarı üretme. İç scope'ta gölgelenen değişkenin gerçek binding'i kullanılsın. Eksik scopeManager güvenli şekilde çözümsüz kalmalı.
   **Kontrol:** `npm test -- --reporter dot` → tümü geçer.

## Test planı ve bitiş

- Geçerli '/about' const'u her karşılaştırma biçiminde sessiz; '/missing' beklenen messageId ile raporlanır.
- Identifier ve ifadeli template üzerinde `suggestions: []` bekle; tanım değişikliği yok. Literal mevcut Quick Fix çıktıları korunur.
- includes içindeki zaten mevcut doğru rota tekrar önerilmez.
- Her kapatma seçeneği (checkEquality/checkIncludes/checkSwitch) yeni değer biçimlerinde de çalışır.
- `rg -n 'function createStaticIdentifierResolver' lib rules` → yalnız ortak modülde bir tanım.
- `npm test -- --reporter dot`, değişen JS için node --check ve git diff --check exit 0.

## Durma koşulları ve bakım

Bir değer için import dosyası okumak, fonksiyon çalıştırmak veya kullanım noktası yerine tanımı düzeltmek gerekiyorsa o biçimi çözümsüz bırak; kapsamı büyütme. Mevcut navigation testinin kırılması taşıma regresyonudur; çözmeden tamamlandı deme.
Yeni string biçimleri gelecekte yalnız ortak resolver'a eklenmeli; rule reporter içine evaluation mantığı konmamalı.
