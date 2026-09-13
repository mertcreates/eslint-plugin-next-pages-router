# Uygulama planları

2026-09-12 · Taban: 2d1536b + mevcut commit edilmemiş performans/benchmark düzeltmeleri.
Bu dört plan improve ve writing-for-agents becerileriyle hazırlandı. Uygulama ve bağımsız denetimler kullanıcının talebiyle Luna 5.6 / max alt ajanlarla tamamlandı. Denetlenen sonuç, kullanıcının açık aktarım talimatıyla ana çalışma dizinine dahil edildi; önceki staged içerik korundu, yeni değişiklikler stage edilmedi.

## Sıra ve durum

| Plan | Sonuç | Öncelik | Efor | Bağımlılık | Durum |
| --- | --- | --- | --- | --- | --- |
| [001](001-clear-messages.md) | Anlaşılır mesajlar ve Quick Fix açıklamaları | P1 | S | Yok | DONE — izole kopyada uygulandı ve bağımsız denetim onayladı |
| [002](002-static-comparisons.md) | Sabit değişkenlerle karşılaştırmaları denetleme | P1 | M | 001 sonrası önerilir | DONE — izole kopyada uygulandı ve bağımsız denetim onayladı |
| [003](003-router-bindings.md) | Router binding'lerini doğru tanıma | P1 | M | Uyumluluk kararı; 002 sonrası önerilir | DONE — yeniden atama düzeltmesi sonrası bağımsız denetim APPROVE |
| [004](004-config-completion.md) | Yapılandırma tipleri ve tamamlama | P2 | M | Yok; en son önerilir | DONE — gerçek ESLint 8/9 paket tüketicileri geçti; kilit metadata bulgusu giderildi |

Durumlar: TODO, IN PROGRESS, DONE, BLOCKED (gerekçe), REJECTED (gerekçe).
Uygulayıcı kendi planını tamamen okusun; yalnız yeni uygulama talimatıyla başlasın.
Bitişte bu tabloda kanıt ve varsa kalan doğrulama eksiğini kaydetsin.

## Bağımlılıklar ve kararlar

- Önerilen sıra 001 → 002 → 003 → 004. Bu bir dört-PR zorunluluğu veya Git commit talimatı değildir.
- 001–003 aynı rule dosyalarına dokunur; sıralı uygulama çakışmayı azaltır. Önceki planın tamamlandığı değişiklikleri drift sanıp geri alma.
- 004 teknik olarak bağımsızdır; README ve package.json çakışmaları nedeniyle sıralı uygulama daha kolaydır.
- 003, explicit routerObjects ile otomatik keşif arasındaki önerilen uyumluluk sözleşmesini kullanıcı onayına sunar. Saf import-only varsayılan moda sessiz geçiş yapılmaz.
- 004, mevcut kurulu olmayan TypeScript test araçlarını gerektirir. Uygun sürümler uygulama anında doğrulanacak; bağımlılık veya runtime major yükseltmesi onaysız yapılmayacak.
- Başlangıç kontrolü: npm test -- --reporter dot, 173 passing (Node 22.22.2 / ESLint 9.39.4). CI'nin tamamı veya native editör bu planlama turunda sınanmadı.

## Uygulama ve denetim kanıtı

- Ana dizine aktarım sonrası: `bun install --frozen-lockfile`, `npm test -- --reporter dot` (245 passing), `npm run test:types` ve `git diff --check` başarılı. Plan dosyaları dışındaki tüm kaynaklar denetlenen birleşik kopyayla byte düzeyinde eşleşiyor; aktarım öncesi/sonrası staged diff SHA-256 aynı. Aşağıdaki izole çalışma kayıtları önceki aşamanın tarihçesidir. Commit veya push yapılmadı.

- 001: bağımsız mesaj denetimi 23 messageId ve 15 davranış karşılaştırmasını doğruladı. README statik URL ayrımı düzeltildikten sonra APPROVE. 177 test geçti.
- 002: bağımsız denetim sabitler, gölgeleme, döngüler, bilinmeyen değerler ve öneri güvenliğini onayladı. 204 test geçti.
- 001+002 birleşik sonuç: `/private/tmp/eslint-plugin-next-routing-integration.6w6njr`; ana ajan tarafından `npm test -- --reporter dot` ile 208 passing, `git diff --check` başarılı. Kilitli ESLint 9.39.2 / Node 22.22.2.
- 004: `/private/tmp/eslint-plugin-next-routing-work-GNA42b/work`; ilk denetimin ESLint 8 tip bağımlılığı bulgusu için `@types/eslint@8.56.12` yayımlanan bağımlılığa taşındı, fiziksel paket tüketici testleri eklendi. Bağımsız denetim gerçek ESLint 8.57.1 ve 9.39.2 kurulumlarında strict CJS/ESM derlemeyi ve çalışma zamanı exportlarını doğruladı. Kalan tek bulgu olan bun.lock bağımlılık kategorisi düzeltildi; frozen kurulum ve birleşik tip testleri yeniden geçti. TypeScript 5.8.3 yalnız geliştirme bağımlılığıdır; Node gereksinimi >=14.17, paket minimumu değişmedi.
- Kullanıcının 2026-09-12 tarihli “Devam edelim” talimatıyla, kendisine açıkça sunulan 003 uyumluluk sözleşmesi uygulanıyor. Ana dizine aktarım/stage/commit/push yapılmadı.
- 003: App Router kaynak ayrımı ve sonradan yeniden atanan `let router` sınırları RED/GREEN testleriyle düzeltildi. Bağımsız son denetim alias, scope gölgeleme, açık/boş allowlist, props.router ve legacy fallback matrisini onayladı.
- Nihai birleşik kopya: `/private/tmp/eslint-plugin-next-routing-integration.6w6njr` (detached HEAD, commit edilmemiş). Ana ajan ve bağımsız denetçi `npm test -- --reporter dot` → **245 passing**, `npm run test:types` → exit 0, `git diff --check` → exit 0 doğruladı. Benchmark smoke 31 diagnostic üretti; bu sonuç hızlanma iddiası değildir.
- Eksik doğrulama: native editörde görsel Quick Fix/tamamlama smoke testi ve Node 18/20 CI matrisinin tamamı bu oturumda çalıştırılmadı. TypeScript LanguageService üzerinden gerçek completion/quick-info testleri geçti. Yayınlama veya deploy yapılmadı.

## Kapsam dışında bırakılanlar

- Eksik dinamik query parametresi kontrolü: faydalı olabilir, fakat seçilen dört adım arasında değil.
- Rota string tamamlama / VS Code extension / Next.js type augmentation: config completion'dan ayrı ürün kararı.
- Dizin stat kontrolünü azaltma: değişiklik algılama sözleşmesi korunmalı; bu planların kapsamı değil.
- Tahmini rotaları otomatik --fix ile değiştirme: kullanıcının hedefini değiştirebilir; mevcut kullanıcı-seçimli suggestion yaklaşımı korunur.
- Depolanan proje hikâyesini yeniden yazma, yeni özellik duyurusu, npm publish veya Git push yok.
