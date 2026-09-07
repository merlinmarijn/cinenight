UPDATE polls
SET title = 'Movie Suggestions'
WHERE title = 'Film Önerileri';

UPDATE polls
SET description = 'Automatically created suggestion list.'
WHERE description = 'Otomatik oluşturulan öneri listesi.';

UPDATE watch_events
SET title = CONCAT(SUBSTRING(title, 1, CHAR_LENGTH(title) - CHAR_LENGTH(' - İzleme Gecesi')), ' - Movie Night')
WHERE title LIKE '% - İzleme Gecesi';

UPDATE user_groups
SET description = 'A group created for movie nights.'
WHERE description = 'Film geceleri için oluşturulmuş bir grup.';
