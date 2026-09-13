# Plan 003: Next.js router binding'lerini tanı ve yanlış uyarıları azalt

Öncelik P1 · Efor M · Risk MED · Kategori direction/bug · Önerilen sıra: 002 sonrası (aynı rule dosyaları).

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

Alias adlarını desteklemek ve kesinlikle ilgisiz nesneleri ayırmak. Mevcut kullanıcı ayarlarını sessizce yeniden yorumlamak yerine uyumluluk sözleşmesini önce onaylat.

- lib/routerObjects.js:
  `if (!hasAllowlist) { return true; }`
  `if (node.type === 'Identifier') { return allowedNames.includes(node.name); }`
- lib/ruleContext.js splitRouterObjects, seçenek verilmezse router ve Router adlarını ekler.
- lib/routerCalls.js, getAllowedRouterMethodCall aynı isim kontrolünü kullanır.
- lib/nextLink.js halihazırda getScopeVariable ve isImportedBindingFromSource ile next/link import binding'ini doğrular; yaklaşım örneği budur.
- rules/no-invalid-router-navigation.js sourceCode.getScope(node) / context.getScope() uyumluluk erişimi içerir.
- `import { useRouter } from 'next/router'; const navigation = useRouter(); navigation.push('/missing')` kaçıyor.
- `const router = { push(value) {} }; router.push('/missing')` yanlış uyarı alıyor.

## Kapsam

lib/routerObjects.js, lib/routerCalls.js, lib/ruleContext.js (yalnız explicit seçenek bilgisini koruma), lib/ast.js (mevcut scope yardımcıları gerektiğinde), iki rules/*.js, tests/rules/no-invalid-route-compare.test.js, tests/rules/no-invalid-router-navigation.test.js, yeni tests/rules/routerObjects.test.js, README.md, plans/README.md.
Next/link davranışı, rota evaluator'ları, AST genel veri-akışı sistemi, destructured push/route, CommonJS require izleme ve App Router desteği kapsam dışıdır.

## Adımlar

Uygulama kararı (2026-09-12): Aşağıdaki sözleşme kullanıcıya açıkça sunuldu; kullanıcı “Devam edelim” talimatını verdi. Açık routerObjects ayarını koruyan ve belirsiz eski kullanımlarda fallback bırakan öneriyle devam edilir; yalnız-import varsayılan moda geçilmez.

1. **Uyumluluk kararını al; henüz kaynak değiştirme.** Önerilen sözleşmeyi kullanıcıya göster:
   - Açıkça verilen routerObjects (boş dizi dahil) mevcut anlamını korur; otomatik keşif bu listeyi genişletmez.
   - Seçenek verilmezse next/router default import'u ve named useRouter (import alias dahil) çağrısının const sonucu isimden bağımsız tanınır.
   - Çözümlenmemiş router/Router, mevcut kodlara destek için isim fallback'ini korur.
   - Kesinlikle ilgisiz yerel object literal veya başka modülden import edilen router/Router atlanır.
   - Parametre/prop veya bilinmeyen factory gibi kanıtlanamayan legacy binding'lerde mevcut isim fallback'i korunur.
   - next/navigation binding'leri Pages Router sayılmaz.
   Bu, varsayılan davranışa yeni uyarılar ve bazı uyarıların kaldırılmasını getirir; plan onayı uygulama sözleşmesi onayı değildir.
   **Kontrol:** `git diff -- lib rules` başlangıç farkıyla aynı; kullanıcı kararı planın bu bölümüne tarih ve kesin metinle eklenmiş. Karar yoksa yalnız bu plan BLOCKED, diğer planlar ilerleyebilir.
2. **Onaylanan matrisi testleştir.** Her iki kuralda: alias import, const hook sonucu, hook adının içeride shadow edilmesi, router değişkeninin içeride shadow edilmesi, başka kaynaktan useRouter, custom allowlist/props.router, boş allowlist, unresolved global ve bilinmeyen parametre örnekleri.
   **Kontrol:** `npx --no-install mocha tests/rules/routerObjects.test.js tests/rules/no-invalid-route-compare.test.js tests/rules/no-invalid-router-navigation.test.js` → yeni alias ve false-positive testleri beklenen nedenle RED.
3. **Tek bir per-file binding kararı ekle.** Mevcut scope yardımcılarını kullan; sadece isim toplamakla yetinme. Hook initializer'ındaki identifier'ın gerçek import specifier'ı useRouter ve source'u next/router olmalı. Const sonuçta sonradan yazma/mutation belirsizliğini hesaba kat; alias zinciri/data-flow çözümlemesi ekleme. İki rule aynı router tanıma sınırını kullansın. Eksik scope bilgisiyle import kökeni uydurma; onaylı legacy fallback'i koru.
   **Kontrol:** dar testler GREEN; `npm test -- --reporter dot` exit 0.
4. **Davranışı belgele.** README'de otomatik tanınan kısa örnek ve custom routerObjects geçersiz kılma davranışı olsun. Desteklenmeyen wrapper'lar için mevcut ayarı göster.
   **Kontrol:** `git diff --check` exit 0; `node scripts/benchmark.js --routes 100 --statements 400 --mode files --files 10 --iterations 2 --warmup 1 --json true` exit 0 ve diagnosticsPerRun > 0.

## Test planı ve bitiş

- Onaylı matris iki kuralın equality/includes/switch ve push/replace yollarında sınanır; scope shadowing yanlış uyarı üretmez.
- Next/link alias/shadow testleri değişmeden geçer.
- Eski unresolved router/Router örnekleri ve explicit routerObjects testleri korunur.
- Fixture testleri ESLint 8/9 uyumlu yardımcıyı kullanır; çalıştırılmayan matris hücresini raporla.
- Kaynak farkı yalnız bu scope'ta; npm test ve git diff --check exit 0.

## Durma koşulları ve bakım

Uyumluluk kararı eksikse uygulamayı başlatma. Yeni seçenek, varsayılan “yalnız import” modu, require çözümleme veya public API kaldırma gerekiyorsa ayrı karar iste.
İleride yeni router wrapper desteği eklendiğinde isim değil scope binding'i doğrula; explicit allowlist önceliğini koru.
