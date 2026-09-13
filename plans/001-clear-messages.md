# Plan 001: Lint mesajlarını ve başlangıç anlatımını anlaşılır yap

Öncelik P1 · Efor S · Risk LOW · Kategori docs/dx · Bağımlılık yok.

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

Kullanıcıya hangi değerin neden sorunlu olduğunu ve ne yapabileceğini anlat. Projenin mevcut İngilizce dilini koru; Türkçe çeviri veya çok-dillilik sistemi ekleme.

- rules/no-invalid-router-navigation.js, `meta.messages`: “Link href is called with ...” ve “Use a URL object with pathname/query or pass a concrete as URL.”
- rules/no-invalid-route-compare.js, `meta.messages`: “which is not a known route pattern”.
- lib/suggestions.js, `buildUrlObjectDesc`: `return 'Replace with UrlObject form';`
- README.md başlangıcında “route literals and statically resolved strings”; Benchmarks bölümünde iç ölçüm mekanizması anlatılıyor.
- tests/rules/no-invalid-router-navigation.test.js öneri sonucunu `{ desc: buildReplacementDesc('/posts/[id]'), output: ... }` ile denetliyor. Bu çıktı testi kalmalı; yeni metin testleri beklenen metni üretim yardımcısından almamalı.

## Kapsam

README.md, package.json (yalnız description), rules/no-invalid-route-compare.js ve rules/no-invalid-router-navigation.js (yalnız meta.docs/metinler), lib/suggestions.js (yalnız açıklama metinleri), tests/rules/no-invalid-route-compare.test.js, tests/rules/no-invalid-router-navigation.test.js ve yeni tests/rules/messages.test.js.
Durum kaydı için plans/README.md. BENCHMARKS.md mevcut teknik açıklamayı zaten içerir; sayıları veya ölçüm kodunu değiştirme.
Kural adları, messageId, seçenekler, severity, fix aralıkları, AST tanıma ve öneri seçimi kapsam dışıdır.

## Adımlar

1. **Metin davranışını sabitle.** Yeni messages.test.js içinde Linter ile gerçek çıktı üret; fixture pages dizinini kullan ve suggestions seçeneğini açıkça belirle. Üç aileyi kapsa: bulunamayan sayfa, dinamik yer tutucu, nesne biçimi önerisi.
   Önerilen metinler:
   - `No page matches '{{value}}'.{{suggestion}}` (navigationUnknown ve linkHrefUnknown).
   - `Use a URL with parameter values, such as '/posts/123', instead of '{{value}}'.` (asWithPattern/linkAsWithPattern; mevcut mesaj verilerini kullan).
   - Quick Fix: `Use pathname and query instead of separate URLs`.
   Diğer mesajlarda alan adını, yanlış değeri ve tek uygulanabilir yönlendirmeyi koru. Var olmayan hedef dosya veya parametre değeri uydurma.
   **Kontrol:** `npx --no-install mocha tests/rules/messages.test.js` → eski metinlerden kaynaklanan başarısızlık; sonra tüm metinler için bağımsız beklenen string/senaryo eşlemesi ekle.
2. **Metinleri uygula.** Link prop'una “called with” deme. “pattern” ilk gerektiğinde “a page path such as /posts/[id]” örneğiyle açıkla. Bilinmeyen statik sayfaya her zaman dinamik sayfa önerme. `{{suggestion}}` yalnız gerçek öneri varsa görünmeye devam etsin.
   **Kontrol:** aynı dar test exit 0; iki mevcut RuleTester dosyasını birlikte çalıştır → öneri çıktıları değişmeden geçer.
3. **README'yi kullanıcı akışına göre düzenle.** Önce amaç ve kısa yanlış/doğru örneği, sonra kurulum ve Quick Fix kullanımı. Alt+Enter/Ctrl+. gibi platforma bağlı tuş sözü vermeden editörün Quick Fix menüsünü tarif et. ESLint suggestions ile yazarken tamamlama ve otomatik `--fix` ayrımını belirt. Ana Benchmarks bölümünü kısa kullanıcı açıklaması ve mevcut BENCHMARKS.md bağlantısı yap. Yazarın proje hikâyesini, bağlantıları ve seçenek isimlerini koru.
   **Kontrol:** `git diff -- README.md package.json rules lib/suggestions.js` → metin dışında davranış farkı yok; README örneklerini fixtures ile Linter testlerine taşı → exit 0.

## Test planı ve bitiş

- Her messageId için gerçek veya parametreli çıktı testi; çözülmemiş `{{...}}`, “undefined” ve eksik öneri eki yok.
- Öneri açık/kapalı; literal düzeltme ve UrlObject dönüşümünde mevcut replacement çıktısı aynen korunur.
- `npm test -- --reporter dot` ve `git diff --check` exit 0.
- İnsan kontrolü: her mesaj “hangi değer, sorun ne, sonraki hareket ne” sorularını kısa biçimde cevaplar. Bu rubric'i test sayısıyla karıştırma.

## Durma koşulları ve bakım

Metni düzeltmek için yeni report verisi, davranış veya fix algoritması gerekiyorsa etkilenen değişikliği durdur ve gerekçeyi bildir. Metin testlerini üretim string'lerini import ederek tautolojiye dönüştürme.
Gelecekte yeni mesaj eklenirken aynı somut örnek ve güvenli Quick Fix ölçütünü uygula.
