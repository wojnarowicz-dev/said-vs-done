# Fixtures

Two directories that together are the smallest reproduction of the problem this
tool exists for: the promise is written in one repository and kept in another.

    site/   client-facing text. Four languages, an HTML page and a translation
            table. Every sentence here is planted and its expected reading is
            listed below.
    app/    the implementation. A migration that deletes after 30 days, and a
            mailer that answers.

`site/` alone must NOT be enough to judge the deletion promise. That is the
point of the split, and `test/scope.mjs` asserts it.

## Planted in site/

| where | sentence | expected |
|---|---|---|
| privacy.html, i18n | "Zgloszenia kasuje po 30 dniach" (4 langs) | sure / deletion, number 30 |
| privacy.html, i18n | "Odpowiadam na adres..." (4 langs) | sure / response |
| privacy.html | "Nie udostepniamy Twoich danych nikomu" | sure / sharing / negated |
| privacy.html | "Haslo jest przechowywane wylacznie..." | edge / storage / passive |
| privacy.html, i18n | "Nagranie nie opuszcza Twojego komputera" | edge / transmission / subject |

## Planted to be MISSED — the negative fixtures

These are why `test/negative.mjs` exists. Each one is a sentence a careless
dictionary reports as a promise.

| where | sentence | why it is not a promise |
|---|---|---|
| privacy.html | "Systemy i programy to nie problemy" | plural nouns ending in -my, not first person plural |
| privacy.html | "To nie jest obietnica, ze dane sa bezpieczne" | metatext: talks about a promise, makes none |
| CSS comment | "reszta strony zostaje na miejscu" | not client-facing |
| script comment | "Nie wysylamy niczego" | not client-facing |
| HTML comment | "usuwamy wszystko" | not client-facing |
| i18n en | "I have to send a recording to a server" | modal: obligation, not commitment |
| i18n es | "No se ha enviado ninguna incidencia" | impersonal passive, not first person |
