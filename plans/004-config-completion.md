# Plan 004: ESLint yapılandırması için tipler ve editör önerileri sun

Öncelik P2 · Efor M · Risk MED · Kategori dx/direction · Önerilen sıra 003 sonrası; teknik bağımlılık yok.

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

Paket import'u, preset adları ve kullanıcı açıkça tip verdiğinde kural seçenekleri için editör önerisi sağla. router.push içindeki rota string'lerini tamamlamak bu planın amacı değildir.

- package.json: `"type": "commonjs", "main": "index.js", "exports": { ".": "./index.js" }`; types alanı yok, files listesinde declaration yok.
- index.js yalnız `rules` ve `configs` export eder; preset'ler recommended ve flat/recommended.
- Ortak schema seçenekleri: pagesDir, basePath, locales, readNextConfig, nextConfigPath, routerObjects, warnOnUnknownPaths, suggestClosestRoute, skipIfPagesDirMissing.
- Compare ekleri: routeProperties, checkEquality, checkIncludes, checkSwitch. Navigation eki: preferUrlObject.
- TypeScript kurulu değil; mevcut typecheck script'i yok. Bu plandaki test:types komutu YENİ oluşturulacaktır.

## Kapsam

Yeni index.d.ts, package.json (types/exports/files ve yalnız tip testi için devDependencies/scripts), bun.lock (yalnız onaylı dev araçları), yeni tests/types/config.cts, tests/types/config.mts, tests/types/tsconfig.json, tests/types/completions.cjs, tests/types/package.test.cjs, .github/workflows/ci.yml (tip doğrulama adımı), README.md, plans/README.md.
index.js runtime export şekli, dependency major upgrade, ESLint global RuleOptions augmentation, yeni config factory, rota tipi üretimi, Next.js tiplerini yamama ve VS Code extension kapsam dışıdır.

## Adımlar

1. **Tip testinin araçlarını belirle.** Desteklenen Node/ESLint aralığına uygun TypeScript ve gerekiyorsa ESLint tip paketinin sürümünü doğrula. Bunları yalnız devDependency olarak eklemek için kapsam/risk brief'i ver; mevcut dependency major değişimi veya minimum Node yükseltmesi gerekiyorsa dur.
   **Kontrol:** araç eklendikten sonra `node -p "require('typescript/package.json').version"` sürüm döndürür; `git diff -- package.json bun.lock` yalnız gerekli araçları gösterir. Otomatik en son sürümü kurma.
2. **Tüketici testlerini önce yaz.** .cts ile require/import-equals, .mts ile ESM import kullan; gerçek paket adı üzerinden çözümle. Root export'ta rules ve iki preset; CompareOptions ve NavigationOptions gibi adlandırılmış tipler için CommonJS `export =` ile declaration namespace yaklaşımını değerlendir. Yeni runtime export gerektirme.
   Pozitif örnek `{ pagesDir: 'pages', checkSwitch: false }` CompareOptions'a uyar; yanlış anahtar, boolean yerine string, navigation'da checkSwitch ve compare'de preferUrlObject için @ts-expect-error yaz.
   **Kontrol:** yeni `npm run test:types` henüz declaration olmadığı için RED; bu betik tsc --noEmit ve aşağıdaki completion/package testlerini çalıştıracak.
3. **Declaration ve paket çözümlemesini ekle.** Options alanlarına sade İngilizce JSDoc ekle. Preset ve rule adlarını literal anahtarlarla tanımla; arbitrary string/any ile testleri susturma. Runtime ortak alanları eksiksiz modelle. exports içinde types koşulu runtime/default'tan önce olsun; CommonJS runtime hedefi ./index.js olarak kalsın; types ve files index.d.ts'yi içersin.
   Kullanıcıya seçenek tamamlama için açık bir tip anotasyonu veya `satisfies` örneği ver. Bir plugin declaration'ının sıradan ESLint rules nesnesine otomatik güçlü option tipleri kazandırdığını iddia etme.
   **Kontrol:** `npm run test:types` tsc bölümü GREEN; CJS ve ESM fixture'ları strict/noEmit ile geçer; @ts-expect-error kaldırılırsa ilgili hatalar oluşur.
4. **Gerçek completion ve paket kanıtı ekle.** TypeScript LanguageService ile completions.cjs içinde marked cursor konumlarında CompareOptions için pagesDir/checkSwitch; NavigationOptions için preferUrlObject ve absence checkSwitch; plugin.configs için iki preset önerisini assert et. JSDoc quick-info metnini en az bir seçenek için denetle.
   package.test.cjs disposable mkdtemp dizininde `npm pack --ignore-scripts --pack-destination <temp>` kullanarak paketi üretir; index.d.ts arşivde bulunmalı. Paket tüketici fixture'ı tarball'dan çözülmeli; yerel relative import'a kaçmamalı. İzole test bağımlılıklarını yereldeki kurulu araçlardan çöz; production kurulumu veya ağ erişimi gerektiren install script çalıştırma. Geçici alanı finally ile temizle.
   **Kontrol:** `npm run test:types` bütün compile/completion/packaging testleriyle exit 0; TypeScript editor smoke kontrolünde README örneği önerileri gösterir (editöre erişim yoksa bu kısmı açıkça unverified kaydet).
5. **CI ve kullanıcı açıklaması.** test:types adımını mevcut uyumlu matrisle çalıştır; CI runtime sürüm politikasını değiştirme. README'de yalnız kanıtlanan config completion biçimini göster.
   **Kontrol:** `npm test -- --reporter dot`, `npm run test:types`, `git diff --check` exit 0; declarations değişimi runtime testlerini etkilemez.

## Test planı ve bitiş

- Literal rule/preset anahtarları; mevcut tüm schema seçeneklerinin declaration karşılığı var.
- Negatif option testleri gerçekten TS hatası gerektirir; unused @ts-expect-error kabul edilmez.
- LanguageService testi kural seçeneklerini ve JSDoc bilgisini ölçer; yalnız compile başarı iddiası “autocomplete doğrulandı” sayılmaz.
- Tarball CJS ve ESM tüketicide declaration'ı bulur; package.json main/default davranışı korunur.
- CI matrisinin çalıştırılmamış hücreleri ve native editör smoke eksikliği ayrı raporlanır.

## Durma koşulları ve bakım

Mevcut export'a uymak için runtime factory veya global ESLint declaration patch'i gerekiyorsa dur ve alternatifleri sun. TypeScript aracı minimum Node sürümünü yükseltiyorsa sürüm politikasını değiştirme.
Yeni schema seçeneği eklendiğinde declaration, JSDoc ve negatif tip testleri birlikte güncellenmeli. Rota string completion ayrı araştırma/karar olarak kalır.
