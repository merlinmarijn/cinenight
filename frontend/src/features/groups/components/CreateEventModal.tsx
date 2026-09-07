import { useState } from 'react';
import { X, Loader2, MapPin, Clock, Film } from 'lucide-react';
import { createEvent } from '@/api/events';
import { closePoll } from '@/api/polls';
import { DayPicker } from 'react-day-picker';
import { enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import 'react-day-picker/style.css';

type MovieOption = { tmdbId: number; title: string };

type Props = {
    groupId: number;
    pollId: number;
    movies: MovieOption[];
    onClose: () => void;
    onSuccess: () => void;
};

export default function CreateEventModal({ groupId, pollId, movies, onClose, onSuccess }: Props) {
    const [selectedMovieId, setSelectedMovieId] = useState<number>(movies[0].tmdbId);
    const { t } = useTranslation();

    const [selectedDate, setSelectedDate] = useState<Date>();
    const [time, setTime] = useState('21:00');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedMovie = movies.find(m => m.tmdbId === selectedMovieId) || movies[0];

    const handleSubmit = async () => {
        if (!selectedDate) return;

        setLoading(true);
        const [hours, minutes] = time.split(':').map(Number);
        const startDate = new Date(selectedDate);
        startDate.setHours(hours, minutes);

        const res = await createEvent({
            groupId,
            title: `${selectedMovie.title} - Movie Night`,
            tmdbId: selectedMovie.tmdbId,
            startTime: startDate.toISOString(),
            locationText: location || 'Discord / Online'
        });

        if (res.ok) {
            await closePoll(pollId);
            setLoading(false);
            onSuccess();
            onClose();
        } else {
            setLoading(false);
            alert(res.error || t('errors.event_create_failed'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="font-bold text-white">{t('modals.create_event.title')}</h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {movies.length > 1 ? (
                        <div className="bg-gray-800/50 p-3 rounded-xl border border-amber-500/30">
                            <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide text-center">{t('modals.create_event.tie_text')}</div>
                            <div className="space-y-2">
                                {movies.map(m => (
                                    <label key={m.tmdbId} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedMovieId === m.tmdbId ? 'bg-indigo-600/20 border-indigo-500' : 'border-white/5 hover:bg-white/5'}`}>
                                        <input
                                            type="radio"
                                            name="winner_select"
                                            checked={selectedMovieId === m.tmdbId}
                                            onChange={() => setSelectedMovieId(m.tmdbId)}
                                            className="accent-indigo-500 w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-white">{m.title}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1"><Film className="h-3 w-3"/> {t('modals.create_event.winner_label')}</div>
                            <div className="text-lg font-bold text-emerald-400">{selectedMovie.title}</div>
                        </div>
                    )}

                    {/* Calendar */}
                    <div className="flex justify-center rounded-xl bg-gray-800/50 border border-white/5 p-2">
                        <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            locale={enUS}
                            disabled={{ before: new Date() }}
                            styles={{ caption: { color: 'white' }, head_cell: { color: '#9ca3af' }, day: { color: 'white' }, nav_button: { color: 'white' } }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock className="h-3 w-3"/> {t('modals.create_event.time')}</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin className="h-3 w-3"/> {t('modals.create_event.location')}</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Discord..." className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedDate}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="animate-spin h-4 w-4" />}
                        {t('modals.create_event.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
