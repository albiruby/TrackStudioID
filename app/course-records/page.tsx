'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { EmptyState } from '../../components/common/EmptyState';
import { 
  ArrowLeft, 
  Award, 
  RefreshCw, 
  Database,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Navigation,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  MapPin,
  Heart,
  Clock,
  ExternalLink
} from 'lucide-react';
import { 
  getActivities, 
  getCourseRecords, 
  saveCourseRecord, 
  deleteCourseRecord,
  getAthleteProfile 
} from '../../lib/firebase/firestore';
import { CanonicalActivity, CourseRecord, CourseAttempt } from '../../data/types';
import { formatDuration, formatDistanceKm, formatElevation, formatPace } from '../../lib/data/dataLaw';

export default function CourseRecordsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [courseRecords, setCourseRecords] = useState<CourseRecord[]>([]);
  const [athleteProfile, setAthleteProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states for creating a new course record
  const [isCreating, setIsCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedSourceActivityId, setSelectedSourceActivityId] = useState('');
  const [errorSubmitting, setErrorSubmitting] = useState('');

  // Expand status for listing attempts of a course
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Attempt adding inline state
  const [selectedAttemptActivityId, setSelectedAttemptActivityId] = useState<{ [courseId: string]: string }>({});
  const [loadingAttempt, setLoadingAttempt] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [acts, crs, profile] = await Promise.all([
          getActivities(user.uid),
          getCourseRecords(user.uid),
          getAthleteProfile(user.uid)
        ]);
        setActivities(acts || []);
        setCourseRecords(crs || []);
        setAthleteProfile(profile || null);
      } catch (e) {
        console.error('Failed to load course records:', e);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  const isMetric = athleteProfile?.preferredUnits !== 'imperial';



  // Filter ONLY Activities with valid GPS map/route data
  const gpsActivities = activities.filter(a => !!a.summaryPolyline || !!a.polyline);

  // Create standard Course Record operation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newCourseName.trim()) {
      setErrorSubmitting('Course Name is required.');
      return;
    }
    if (!selectedSourceActivityId) {
      setErrorSubmitting('Please select a reference GPS activity.');
      return;
    }

    const sourceAct = activities.find(a => a.id === selectedSourceActivityId);
    if (!sourceAct) {
      setErrorSubmitting('Selected reference activity cannot be resolved.');
      return;
    }

    setErrorSubmitting('');
    try {
      const parentPolyline = sourceAct.summaryPolyline || sourceAct.polyline || '';
      const baseDistance = sourceAct.distanceMeters || 0;
      const baseElev = sourceAct.elevationGainMeters || 0;
      const baseTime = sourceAct.movingTimeSeconds || sourceAct.elapsedTimeSeconds || 0;
      const basePace = baseDistance > 0 ? baseTime / (baseDistance / 1000) : 0;

      const baseAttempt: CourseAttempt = {
        activityId: sourceAct.id!,
        date: sourceAct.startDate || new Date().toISOString(),
        movingTimeSeconds: baseTime,
        distanceMeters: baseDistance,
        paceSecPerKm: basePace,
        averageHeartRate: sourceAct.averageHeartRate || null,
        elevationGainMeters: baseElev
      };

      const courseId = `course_${Date.now()}`;
      const payload: CourseRecord = {
        id: courseId,
        userId: user.uid,
        name: newCourseName.trim(),
        sourceActivityId: sourceAct.id!,
        routePolyline: parentPolyline,
        distanceMeters: baseDistance,
        elevationGainMeters: baseElev,
        bestActivityId: sourceAct.id!,
        bestTimeSeconds: baseTime,
        bestPaceSecPerKm: basePace,
        attempts: [baseAttempt],
        groupingMethod: "manual",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveCourseRecord(user.uid, courseId, payload);
      
      // Update local state
      setCourseRecords(prev => [...prev, payload]);
      setNewCourseName('');
      setSelectedSourceActivityId('');
      setIsCreating(false);
    } catch (err: any) {
      console.error('Error creating course record:', err);
      setErrorSubmitting('Could not save course record. Please check configuration.');
    }
  };

  // Add manually associated attempt to Course Record
  const handleAddAttempt = async (courseId: string) => {
    if (!user) return;
    const activityId = selectedAttemptActivityId[courseId];
    if (!activityId) return;

    const attemptAct = activities.find(a => a.id === activityId);
    if (!attemptAct) return;

    const currentCourse = courseRecords.find(c => c.id === courseId);
    if (!currentCourse) return;

    setLoadingAttempt(courseId);
    try {
      const baseDistance = attemptAct.distanceMeters || 0;
      const baseElev = attemptAct.elevationGainMeters || 0;
      const baseTime = attemptAct.movingTimeSeconds || attemptAct.elapsedTimeSeconds || 0;
      const basePace = baseDistance > 0 ? baseTime / (baseDistance / 1000) : 0;

      const newAttempt: CourseAttempt = {
        activityId: attemptAct.id!,
        date: attemptAct.startDate || new Date().toISOString(),
        movingTimeSeconds: baseTime,
        distanceMeters: baseDistance,
        paceSecPerKm: basePace,
        averageHeartRate: attemptAct.averageHeartRate || null,
        elevationGainMeters: baseElev
      };

      // Check if attempt is already present to prevent duplicate additions
      const existingAttempts = currentCourse.attempts || [];
      const hasDuplicate = existingAttempts.some(att => att.activityId === attemptAct.id);
      if (hasDuplicate) {
        alert('This activity is already logged as an attempt for this course.');
        setLoadingAttempt(null);
        return;
      }

      const updatedAttempts = [...existingAttempts, newAttempt];

      // Scan all attempts for the absolute fastest (best time)
      let bestAttempt = updatedAttempts[0];
      updatedAttempts.forEach(att => {
        if (att.movingTimeSeconds < bestAttempt.movingTimeSeconds) {
          bestAttempt = att;
        }
      });

      const updatedCourse: CourseRecord = {
        ...currentCourse,
        bestActivityId: bestAttempt.activityId,
        bestTimeSeconds: bestAttempt.movingTimeSeconds,
        bestPaceSecPerKm: bestAttempt.paceSecPerKm,
        attempts: updatedAttempts,
        updatedAt: new Date().toISOString()
      };

      await saveCourseRecord(user.uid, courseId, updatedCourse);

      // Reflect in local state
      setCourseRecords(prev => prev.map(c => c.id === courseId ? updatedCourse : c));
      
      // Clear dropdown select choice
      setSelectedAttemptActivityId(prev => ({ ...prev, [courseId]: '' }));
    } catch (err) {
      console.error('Failed to log attempt:', err);
    } finally {
      setLoadingAttempt(null);
    }
  };

  // Delete Course Record
  const handleDeleteCourse = async (courseId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to permanently delete this course and its historical attempts?')) return;

    try {
      await deleteCourseRecord(user.uid, courseId);
      setCourseRecords(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      console.error('Delete operation failed:', err);
    }
  };

  // Stats calculation
  const totalCourses = courseRecords.length;
  const totalAttemptsCount = courseRecords.reduce((sum, c) => sum + (c.attempts?.length || 0), 0);
  const totalGpsActivitiesCount = gpsActivities.length;

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold font-mono">Loading Course Registry...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#FC5200] transform rotate-45" />
                <h1 className="text-xl font-bold uppercase tracking-wide text-white leading-none font-mono">Course Records</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
                Map and track peak times and pacing segments across repetitive running routes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-4 py-2 bg-[#FC5200] hover:bg-[#ff6414] text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create Course</span>
            </button>
          </div>
        </div>

        {/* DATA DIAGNOSTICS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Total Courses Map</span>
            <span className="text-lg font-bold text-white font-mono mt-1 block">{totalCourses} Active</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Total Course Attempts</span>
            <span className="text-lg font-bold text-[#FC5200] font-mono mt-1 block">{totalAttemptsCount} Logs</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">GPS GPS Sources</span>
            <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">{totalGpsActivitiesCount} Active</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Group Logic Method</span>
            <span className="text-lg font-bold text-cyan-400 font-mono mt-1 block uppercase">Manual</span>
          </div>
        </div>

        {/* NOTICE: GENERAL PRODUCT LAW EXPLANATIONS */}
        <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono font-bold leading-normal">
              Manual course grouping is used in this version.
            </span>
          </div>
          <span className="text-[9px] text-zinc-550 font-mono uppercase bg-zinc-800/80 border border-white/10 px-2 py-1 rounded">
            Anti-AI Policy Activated
          </span>
        </div>

        {/* CREATE COURSE FORM PANE */}
        {isCreating && (
          <div className="bg-[#111113] border border-[#FC5200]/20 rounded-lg p-6 space-y-4">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold uppercase font-mono text-white">Setup GPS Course Record mapping</h3>
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider mt-1">Select a real GPS activities run to lock the base distance and path</p>
            </div>

            {gpsActivities.length === 0 ? (
              <div className="border border-red-900/30 bg-red-950/20 p-4 rounded text-center text-xs text-red-400 uppercase font-bold font-mono">
                GPS route data is required for course records. No workouts containing geometric map layers are registered.
              </div>
            ) : (
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Course Name</label>
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="e.g. Sunset Loop 10K, Gellibrand Hill Run"
                      className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FC5200] font-mono"
                    />
                  </div>

                  <div>
                     <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Reference Activity Track</label>
                     <select
                       value={selectedSourceActivityId}
                       onChange={(e) => setSelectedSourceActivityId(e.target.value)}
                       className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FC5200] font-mono"
                     >
                       <option value="">-- Select GPS Activity --</option>
                       {gpsActivities.map(a => (
                         <option key={a.id} value={a.id}>
                           {a.startDate?.slice(0, 10)} - {a.name} ({formatDistanceKm(a.distanceMeters, isMetric)})
                         </option>
                       ))}
                     </select>
                  </div>
                </div>

                {errorSubmitting && (
                  <span className="text-xs text-red-500 font-mono font-bold uppercase block">{errorSubmitting}</span>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FC5200] hover:bg-[#ff6414] text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
                  >
                    Lock Path
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* LIST OF COURSE RECORDS */}
        {courseRecords.length > 0 ? (
          <div className="space-y-4">
            {courseRecords.map((course) => {
              const acts = course.attempts || [];
              const isExpanded = expandedCourseId === course.id;
              
              // Filter out activities that are already attempts so they aren't duplicate candidate loggers
              const duplicateAttemptIds = acts.map(att => att.activityId);
              const attemptCandidates = gpsActivities.filter(a => !duplicateAttemptIds.includes(a.id!));

              // Find details of the best effort activity
              const bestActRef = activities.find(a => a.id === course.bestActivityId);
              const bestActName = bestActRef ? bestActRef.name : 'Primary Record';
              
              return (
                <div key={course.id} className="bg-[#111113] border border-white/10 rounded-lg overflow-hidden">
                  
                  {/* Outer Course Summary Row */}
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.01]">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#FC5200]" />
                        <h3 className="text-base font-extrabold text-white uppercase font-sans tracking-tight">{course.name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-zinc-400 text-[11px] font-mono leading-none">
                        <span>EST. LENGTH: <strong className="text-white font-extrabold">{formatDistanceKm(course.distanceMeters, isMetric)}</strong></span>
                        <span className="text-zinc-650">|</span>
                        <span>ELEV GAIN: <strong className="text-white font-extrabold">{formatElevation(course.elevationGainMeters, isMetric)}</strong></span>
                        <span className="text-zinc-650">|</span>
                        <span>ATTEMPTS: <strong className="text-[#FC5200] font-extrabold">{acts.length} Run Logs</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8 items-center border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Course Record (PR)</span>
                        <span className="text-lg font-mono font-extrabold text-emerald-400">{formatDuration(course.bestTimeSeconds)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Best Record Pace</span>
                        <span className="text-xs font-mono font-extrabold text-[#FC5200]">{formatPace(course.bestPaceSecPerKm, isMetric)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3">
                      <button
                        onClick={() => setExpandedCourseId(isExpanded ? null : course.id!)}
                        className="px-3 py-1.5 border border-white/10 hover:border-white/20 text-xs font-bold uppercase font-mono tracking-wider rounded flex items-center gap-1 hover:text-white text-zinc-400 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Attempts' : 'View Attempts'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(course.id!)}
                        className="p-2 border border-red-950/45 hover:border-red-900 text-red-500 hover:text-red-400 rounded transition-all cursor-pointer"
                        title="Delete Course Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content: Collapsible list of attempts & lodgement toolbar */}
                  {isExpanded && (
                    <div className="border-t border-white/10 bg-black/40 p-6 space-y-6">
                      
                      {/* Lodgement Widget to Log a new Attempt */}
                      <div className="bg-[#111113] border border-white/10 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs uppercase font-mono font-bold text-white">Log Additional Attempt</span>
                        </div>
                        
                        {attemptCandidates.length === 0 ? (
                          <p className="text-[10px] font-mono uppercase text-zinc-500">
                            No other synced GPS records found to log as attempts. Sync more workouts first.
                          </p>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <select
                              value={selectedAttemptActivityId[course.id!] || ''}
                              onChange={(e) => setSelectedAttemptActivityId(prev => ({ ...prev, [course.id!]: e.target.value }))}
                              className="flex-1 bg-zinc-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white uppercase font-mono"
                            >
                              <option value="">-- Choose workout run log --</option>
                              {attemptCandidates.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.startDate?.slice(0, 10)} - {c.name} ({formatDistanceKm(c.distanceMeters, isMetric)})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAddAttempt(course.id!)}
                              disabled={loadingAttempt === course.id}
                              className="px-4 py-1.5 bg-[#FC5200] hover:bg-[#ff6414] disabled:opacity-55 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {loadingAttempt === course.id ? 'Saving...' : 'Add Effort'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Attempts Listing Table */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Historical Attempt Records (Sorted by date)</span>
                        <div className="border border-white/5 rounded-lg overflow-hidden overflow-x-auto bg-[#111113]">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/[0.01] uppercase font-mono text-zinc-500 text-[10px]">
                                <th className="p-3">Rank No</th>
                                <th className="p-3">Logged Date</th>
                                <th className="p-3">Duration Time</th>
                                <th className="p-3">Mapped Distance</th>
                                <th className="p-3">Average Pacing</th>
                                <th className="p-3">Heart Rate</th>
                                <th className="p-3 text-right">Reference Link</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono">
                              {acts
                                .sort((a, b) => a.movingTimeSeconds - b.movingTimeSeconds)
                                .map((att, index) => {
                                  const isPR = index === 0;
                                  return (
                                    <tr key={index} className={`hover:bg-white/[0.01] ${isPR ? 'bg-emerald-950/10' : ''}`}>
                                      <td className="p-3 font-bold text-zinc-400">
                                        {isPR ? (
                                          <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                                            <Award className="w-3.5 h-3.5" /> CR #1
                                          </span>
                                        ) : (
                                          <span>#{index + 1}</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-zinc-300">
                                        {att.date ? att.date.slice(0, 10) : '--'}
                                      </td>
                                      <td className={`p-3 font-extrabold ${isPR ? 'text-emerald-400' : 'text-white'}`}>
                                        {formatDuration(att.movingTimeSeconds)}
                                      </td>
                                      <td className="p-3 text-zinc-400">
                                        {formatDistanceKm(att.distanceMeters, isMetric)}
                                      </td>
                                      <td className="p-3 text-[#FC5200] font-semibold">
                                        {formatPace(att.paceSecPerKm, isMetric)}
                                      </td>
                                      <td className="p-3 text-zinc-400">
                                        {att.averageHeartRate ? (
                                          <span className="text-rose-400 flex items-center gap-0.5">
                                            <Heart className="w-3 h-3" /> {Math.round(att.averageHeartRate)}
                                          </span>
                                        ) : (
                                          '--'
                                        )}
                                      </td>
                                      <td className="p-3 text-right">
                                        <button
                                          onClick={() => router.push(`/activities/${att.activityId}`)}
                                          className="text-[10px] text-[#FC5200] hover:underline font-bold flex items-center justify-end gap-1 ml-auto"
                                        >
                                          <span>Details</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState 
            title="Course records registry empty" 
            description="Log activities into the dashboard console workout sheets to detect historical record runs. No template or simulated values are permitted." 
            icon={<Navigation className="w-6 h-6 transform rotate-45" />}
          />
        )}

      </div>
    </div>
  );
}
