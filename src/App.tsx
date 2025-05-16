import { useState, useEffect } from "react";

// Definición de tipos
interface SubObjective {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  objective: string;
  timeInMinutes: number | ""; // Cambio aquí: ahora puede ser número o string vacío
  subObjectives: SubObjective[];
}

// Clave para localStorage
const STORAGE_KEY = "focusTask";

function App() {
  // Estados
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [task, setTask] = useState<Task>({
    objective: "",
    timeInMinutes: 25,
    subObjectives: [],
  });
  const [newSubObjective, setNewSubObjective] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false); // Nuevo estado para mostrar/ocultar el formulario de subtareas
  const [overtime, setOvertime] = useState(0); // Nuevo estado para el tiempo excedido

  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    const savedTask = localStorage.getItem(STORAGE_KEY);
    if (savedTask) {
      try {
        setTask(JSON.parse(savedTask));
      } catch (e) {
        console.error("Error parsing saved task:", e);
      }
    }
  }, []);

  // Guardar datos en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(task));
  }, [task]);

  // Evento para prevenir al usuario antes de recargar/abandonar la página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTimerActive || hasUnsavedChanges) {
        // Mensaje estándar que mostrará el navegador (no personalizable)
        const message =
          "¿Seguro que quieres abandonar la página? Los cambios no guardados se perderán.";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isTimerActive, hasUnsavedChanges]);

  // Actualizar el estado de cambios no guardados
  useEffect(() => {
    // Cuando hay un temporizador activo o cuando hay subobjetivos, consideramos que hay cambios no guardados
    if (
      isTimerActive ||
      task.subObjectives.length > 0 ||
      task.objective !== ""
    ) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [isTimerActive, task]);

  // Manejo del temporizador principal
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let interval: any = null;

    if (isTimerActive && !timerPaused && !isCompleted) {
      // Inicializar tiempo si es necesario
      if (timeLeft === 0) {
        const totalSeconds =
          typeof task.timeInMinutes === "number" ? task.timeInMinutes * 60 : 0;
        setTimeLeft(totalSeconds);
      }

      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Temporizador completado
            setIsCompleted(true);
            playAlertSound();
            // Detenemos este intervalo, el contador de overtime se manejará en otro useEffect
            return 0;
          }

          // Actualizar el progreso del círculo
          const totalSeconds =
            typeof task.timeInMinutes === "number"
              ? task.timeInMinutes * 60
              : 0;
          const newProgress = ((prevTime - 1) / totalSeconds) * 100;
          setProgress(newProgress);

          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerActive, timerPaused, task.timeInMinutes, isCompleted]);

  // Manejo separado del contador de tiempo excedido
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let overtimeInterval: any = null;

    if (isTimerActive && !timerPaused && isCompleted) {
      // Solo iniciar el contador de overtime cuando se ha completado el tiempo original
      overtimeInterval = setInterval(() => {
        setOvertime((prevOvertime) => prevOvertime + 1);
      }, 1000);
    }

    return () => {
      if (overtimeInterval) clearInterval(overtimeInterval);
    };
  }, [isTimerActive, timerPaused, isCompleted]);

  // Función para reproducir sonido al finalizar
  const playAlertSound = () => {
    try {
      const playSound = (delay: number) => {
        setTimeout(() => {
          const audioContext = new (window.AudioContext ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          // Configuración del sonido
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

          // Inicio y fin del sonido
          oscillator.start();
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 1
          );

          setTimeout(() => {
            oscillator.stop();
          }, 1000);
        }, delay);
      };

      // Reproducir el sonido tres veces con un intervalo de 1.2 segundos
      playSound(0); // Inmediatamente
      playSound(1200); // Después de 1.2 segundos
      playSound(2400); // Después de 2.4 segundos
    } catch (e) {
      console.error("Error al reproducir sonido:", e);
    }
  };

  // Añadir sub-objetivo
  const addSubObjective = () => {
    if (newSubObjective.trim() === "") return;

    setTask({
      ...task,
      subObjectives: [
        ...task.subObjectives,
        {
          id: Date.now().toString(),
          text: newSubObjective,
          completed: false,
        },
      ],
    });

    setNewSubObjective("");

    // Si estamos en modo de enfoque, ocultamos el formulario después de agregar
    if (isTimerActive) {
      setIsAddingSubtask(false);
    }
  };

  // Cambiar estado de sub-objetivo
  const toggleSubObjective = (id: string) => {
    setTask({
      ...task,
      subObjectives: task.subObjectives.map((subObj) =>
        subObj.id === id ? { ...subObj, completed: !subObj.completed } : subObj
      ),
    });
  };

  // Eliminar sub-objetivo
  const removeSubObjective = (id: string) => {
    setTask({
      ...task,
      subObjectives: task.subObjectives.filter((subObj) => subObj.id !== id),
    });
  };

  // Iniciar temporizador
  const startTimer = () => {
    // Validar que haya un objetivo y un tiempo válido
    if (
      task.objective.trim() === "" ||
      task.timeInMinutes === "" ||
      (typeof task.timeInMinutes === "number" && task.timeInMinutes <= 0)
    ) {
      return;
    }

    // Reiniciar el timer si ya terminó
    if (isCompleted) {
      setIsCompleted(false);
      setOvertime(0);
    }

    setIsTimerActive(true);
    setTimerPaused(false);

    // Configurar tiempo inicial
    const totalSeconds =
      typeof task.timeInMinutes === "number" ? task.timeInMinutes * 60 : 0;
    setTimeLeft(totalSeconds);
    setProgress(100);
  };

  // Pausar/reanudar temporizador
  const togglePause = () => {
    setTimerPaused(!timerPaused);
  };

  // Detener temporizador
  const stopTimer = () => {
    setIsTimerActive(false);
    setTimerPaused(false);
    setIsCompleted(false);
    setOvertime(0);
    setTimeLeft(0);
  };

  // Formatear tiempo para mostrar
  const formatTime = (seconds: number): string => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${isNegative ? "-" : ""}${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Mostrar/ocultar el formulario de subtareas en modo de enfoque
  const toggleAddSubtask = () => {
    setIsAddingSubtask(!isAddingSubtask);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      {!isTimerActive ? (
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 overflow-hidden">
          <div className="text-center mb-6 w-full break-words">
            <h1 className="text-2xl font-bold text-white">Focus Timer</h1>
            <p className="text-slate-400">
              Establece un objetivo y un tiempo para completarlo
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="objective" className="text-white block">
                Objetivo principal
              </label>
              <input
                id="objective"
                placeholder="¿Qué quieres lograr?"
                value={task.objective}
                onChange={(e) =>
                  setTask({ ...task, objective: e.target.value })
                }
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="time" className="text-white block">
                Tiempo (minutos)
              </label>
              <input
                id="time"
                type="number"
                min="1"
                max="120"
                value={task.timeInMinutes}
                onChange={(e) => {
                  // Permitir campo vacío o valores numéricos
                  const value = e.target.value;
                  if (value === "") {
                    setTask({ ...task, timeInMinutes: "" });
                  } else {
                    const numValue = parseInt(value);
                    setTask({
                      ...task,
                      timeInMinutes: isNaN(numValue) ? "" : numValue,
                    });
                  }
                }}
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-white block">Sub-objetivos</label>
              <div className="flex space-x-2">
                <input
                  placeholder="Añadir sub-objetivo"
                  value={newSubObjective}
                  onChange={(e) => setNewSubObjective(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubObjective()}
                  className="flex-1 p-2 rounded bg-slate-700 border border-slate-600 text-white"
                />
                <button
                  onClick={addSubObjective}
                  className="px-4 py-2 rounded border border-slate-600 text-white hover:bg-slate-700"
                >
                  Añadir
                </button>
              </div>

              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {task.subObjectives.map((subObj) => (
                  <div
                    key={subObj.id}
                    className="flex items-center space-x-2 p-2 bg-slate-700 rounded"
                  >
                    <input
                      type="checkbox"
                      id={subObj.id}
                      checked={subObj.completed}
                      onChange={() => toggleSubObjective(subObj.id)}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor={subObj.id}
                      className={`flex-1 ${
                        subObj.completed
                          ? "line-through text-slate-500"
                          : "text-white"
                      }`}
                    >
                      {subObj.text}
                    </label>
                    <button
                      onClick={() => removeSubObjective(subObj.id)}
                      className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {task.subObjectives.length === 0 && (
                  <p className="text-sm text-slate-500 italic">
                    {`No hay sub-objetivos, añade algunos para organizar mejor tu
                    tarea :)`}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={startTimer}
            disabled={
              task.objective.trim() === "" ||
              task.timeInMinutes === "" ||
              (typeof task.timeInMinutes === "number" &&
                task.timeInMinutes <= 0)
            }
            className="w-full mt-6 p-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Iniciar Temporizador
          </button>

          <div className="mt-6 text-center text-sm text-slate-400">
            <p>
              hope it helps... -{" "}
              <a
                href="https://www.linkedin.com/in/ericksiller"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                Erick Siller
              </a>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full max-w-4xl">
          <div className={`relative ${isCompleted ? "animate-pulse" : ""}`}>
            <svg className="w-64 h-64 md:w-96 md:h-96" viewBox="0 0 100 100">
              {/* Círculo de fondo */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#334155"
                strokeWidth="8"
              />
              {/* Círculo de progreso */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={isCompleted ? "#10b981" : "#6366f1"}
                strokeWidth="8"
                strokeDasharray="283"
                strokeDashoffset={
                  isCompleted ? 0 : 283 - (283 * progress) / 100
                }
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-4xl md:text-6xl font-bold">
                {isCompleted
                  ? formatTime(-overtime) // Mostrar tiempo negativo cuando está completo
                  : formatTime(timeLeft)}
              </span>
              {isCompleted && (
                <span className="text-sm text-red-400 mt-2">
                  Tiempo excedido
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold mt-8 text-center w-full break-words px-4 max-w-4xl">
            {task.objective}
          </h1>

          {/* Sección de sub-objetivos */}
          <div className="mt-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sub-objetivos:</h2>
              {!isAddingSubtask ? (
                <button
                  onClick={toggleAddSubtask}
                  className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center"
                >
                  <span className="mr-1">+</span> Agregar sub-objetivo
                </button>
              ) : (
                <button
                  onClick={toggleAddSubtask}
                  className="text-slate-400 hover:text-slate-300 text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Formulario para agregar subtareas durante el modo de enfoque */}
            {isAddingSubtask && (
              <div className="mb-4 bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="flex space-x-2">
                  <input
                    placeholder="Añadir sub-objetivo"
                    value={newSubObjective}
                    onChange={(e) => setNewSubObjective(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubObjective()}
                    className="flex-1 p-2 rounded bg-slate-700 border border-slate-600 text-white"
                    autoFocus
                  />
                  <button
                    onClick={addSubObjective}
                    className="px-4 py-2 rounded border border-slate-600 text-white hover:bg-slate-700"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            )}

            {/* Lista de sub-objetivos */}
            <div className="grid gap-2">
              {task.subObjectives.map((subObj) => (
                <div
                  key={subObj.id}
                  className="flex items-center space-x-2 p-3 bg-slate-800 rounded-lg border border-slate-700"
                >
                  <div className="h-5 w-5 text-amber-500">
                    {subObj.completed ? "✓" : "!"}
                  </div>
                  <span
                    className={`${
                      subObj.completed
                        ? "line-through text-slate-500"
                        : "text-white"
                    } break-words`}
                  >
                    {subObj.text}
                  </span>
                  <input
                    type="checkbox"
                    className="ml-auto h-4 w-4"
                    checked={subObj.completed}
                    onChange={() => toggleSubObjective(subObj.id)}
                  />
                </div>
              ))}

              {task.subObjectives.length === 0 && (
                <p className="text-sm text-slate-500 italic text-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                  No hay sub-objetivos. ¡Agrega algunos para organizar mejor tu
                  tarea!
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 mt-8">
            <button
              onClick={togglePause}
              className={`px-4 py-2 rounded ${
                timerPaused
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-amber-600 hover:bg-amber-700"
              } text-white`}
            >
              {timerPaused ? "Reanudar" : "Pausar"}
            </button>

            <button
              onClick={stopTimer}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              {isCompleted ? "Volver al menú" : "Cancelar"}
            </button>
          </div>

          {isCompleted && (
            <div className="mt-8 p-4 bg-green-600 rounded-lg shadow-lg">
              <p className="text-xl font-bold">¡Tiempo completado!</p>
              <p>
                Has terminado tu sesión de enfoque. Puedes seguir trabajando.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
