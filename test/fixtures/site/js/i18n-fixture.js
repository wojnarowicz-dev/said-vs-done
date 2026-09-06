// A translation table shaped like a real one: four languages, keys, and values
// that carry apostrophes and inline markup, so the string scanner is actually
// exercised rather than handed easy input.
window.FIXTURE_I18N = {
    pl: {
        supportNote: 'Zgłoszenia kasuję po 30 dniach.',
        replyNote: 'Odpowiadam na adres Twojego konta.',
        heroLead: 'Nagranie i tekst zostają na Twoim komputerze.',
        withApostrophe: 'Jeśli konto o tym adresie istnieje, wyślemy na niego link.',
        withMarkup: 'Dane <strong>szyfrujemy</strong> przed zapisem.'
    },
    en: {
        supportNote: 'I delete reports after 30 days.',
        replyNote: 'I reply to your account address.',
        heroLead: 'Your recording never leaves your computer.',
        modalNotPromise: 'To do that at all, I have to send a recording to a server.',
        otherSubject: 'I read that Upheal stores recordings for 60 days.'
    },
    de: {
        supportNote: 'Meldungen lösche ich nach 30 Tagen.',
        replyNote: 'Ich antworte an die Adresse Ihres Kontos.',
        inverted: 'Ihre Daten geben wir nicht weiter.'
    },
    es: {
        supportNote: 'Eliminamos los mensajes a los 30 días.',
        replyNote: 'Respondemos a la dirección de tu cuenta.',
        participle: 'No se ha enviado ninguna incidencia desde esta cuenta.'
    }
};
