# Vardiya

Pembe tonlarda, açık ve koyu temalı kişisel vardiya planlayıcı. HTML, CSS ve JavaScript ile hazırlanmıştır; kurulum için paket yüklemek gerekmez.

## Özellikler

- Başlangıç, bitiş ve saatlik ücret üzerinden çalışma süresi ve tahmini kazanç hesabı
- Gece yarısını aşan vardiyalar
- Aylık takvim, vardiya ekleme ve silme
- Haftalık planlanan saat, tahmini kazanç ve bitmemiş vardiya özeti
- Günlere göre görev listesi ve tamamlanma takibi
- Güneş/ay düğmesiyle açık ve koyu tema
- Tarayıcıda kalıcı kayıt

## Çalıştırma

Python 3 kuruluysa proje klasöründe:

```sh
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

Tarayıcıda http://127.0.0.1:4173 adresini açın.

## Dosyalar

- `dist/index.html`: sayfanın içeriği ve form alanları
- `dist/style.css`: renkler, düzen ve ekran boyutuna göre görünüm
- `dist/app.js`: hesaplamalar, takvim, görevler ve kayıt işlemleri

## Veriler ve hesaplama

Kayıtlar yalnızca kullanılan tarayıcının localStorage alanında tutulur. Sunucuya gönderilmez ve cihazlar arasında eşitlenmez. Tarayıcı site verilerini silmek kayıtları da siler. Farklı bir adres veya port ayrı kayıt alanı kullanır. Yazı tipleri Google Fonts üzerinden yüklenir.

Hafta pazartesi başlar. Vardiyalar başladıkları güne ve haftaya sayılır; gece vardiyasının tüm süresi başlangıç gününe dahil edilir. Kalan vardiya sayısı, bu hafta başlamış veya başlayacak ve henüz bitmemiş vardiyaları içerir. Tarihler cihazın yerel saatine göre değerlendirilir.

Kazanç tahminidir; mola, vergi, kesinti ve fazla mesai katsayısı içermez. Aynı başlangıç ve bitiş saati sıfır saat kabul edilir ve kaydedilemez. Aynı gün ve saatlerde aynı vardiya tekrar kaydedilemez; farklı saat aralıklarının çakışması henüz kontrol edilmez. Görevler bir kontrol listesidir; zamanlı bildirim göndermez.

## Kontrol

```sh
node --check dist/app.js
```

Tarayıcıda vardiya kaydetme, sayfayı yenileyerek kalıcılık, gece vardiyası hesabı, görev tamamlama ve tema değiştirme denenebilir.
