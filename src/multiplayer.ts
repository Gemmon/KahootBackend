import { Server, Socket } from "socket.io";
import { generateRandomString } from "./functions.js";
import prisma, { getFullQuizById } from "./db.js";
import { v4 as uuidv4 } from 'uuid';
import randomName from '@scaleway/random-name'
import { titleCase } from "title-case";

interface GameData {
  host: GameUserData;
  players: GameUserData[];
  quizId?: number;
  state: 'waiting' | 'playing' | 'finished';
  quiz: Awaited<ReturnType<typeof getFullQuizById>>;
  questionOrder: number[];
  currentQuestion: number;
  gameId?: number;
}

interface GameUserData {
  uuid: string;
  username: string;
  socket: Socket;
  answered: boolean;
  isHost?: boolean;
  answers?: number[];
  points: number;
  dbid?: number;
  gamePlayerId?: number;
}

type SocketCallback<T extends any[]> = (...args: T) => void;

var gameData: { [key: string]: GameData } = {};

function getPlayersList(gameData: GameData | undefined): Pick<GameUserData, 'uuid' | 'username' | 'isHost'>[] {
  return gameData ? (gameData.players || []).map(player => ({
    uuid: player.uuid,
    username: player.username,
    isHost: player.isHost || false
  })) : [];
}

async function setQuiz(gameData: GameData, quizId: number | undefined) {
  gameData.quiz = null;
  gameData.questionOrder = [];
  gameData.currentQuestion = -1;
  if (quizId === undefined) {
    return null;
  }
  const quiz = await getFullQuizById(quizId);
  if (!quiz) {
    return null;
  }
  gameData.quiz = quiz;
  gameData.questionOrder = Array.from({ length: quiz.Question.length }, (_, i) => i);
  gameData.questionOrder.sort(() => Math.random() - 0.5);
  return quiz;
}

function getRanking(gameData: GameData): { uuid: string; username: string; points: number }[] {
  return gameData.players
    .map(player => ({ uuid: player.uuid, username: player.username, points: player.points }))
    .sort((a, b) => b.points - a.points);
}

function getAnswersDistribution(gameData: GameData, questionIndex: number): Record<number, number> {
  const distribution: Record<number, number> = {};
  gameData.players.forEach(player => {
    const answer = player.answers ? player.answers[questionIndex] : undefined;
    if (answer !== undefined) {
      distribution[answer] = (distribution[answer] || 0) + 1;
    }
  });
  return distribution;
}

export default function setupSocket(io: Server) {
  io.on("connection", (socket) => {
    socket.uuid = socket.handshake.auth['uuid'] || uuidv4();
    socket.gameId = socket.handshake.auth['gameId'] || '';
    socket.username = socket.handshake.auth['username'] || titleCase(randomName('', ' '));
    if (gameData[socket.gameId]) {
      const game = gameData[socket.gameId];
      const existingPlayer = game.players.find(player => player.uuid === socket.uuid);
      if (existingPlayer) {
        socket.username = existingPlayer.username;
        socket.host = existingPlayer.isHost || false;
        existingPlayer.socket = socket;
        existingPlayer.answered = true; 
        console.log(`Reconnected player: ${socket.username} (${socket.uuid})`);
      }
    }
    else {
      socket.host = false;
      socket.emit("player:connected", socket.uuid, socket.username);
      console.log(`New player connected: ${socket.username} (${socket.uuid})`);
    }

    socket.on("game:join", (gameId: string, cb: SocketCallback<[string?, string?]>) => {
      var game = gameData[gameId];
      if (game) {
        if (game.state !== "waiting") {
          cb(undefined, "Gra już się rozpoczęła");
          return;
        }
        socket.join(gameId);
        socket.gameId = gameId;
        socket.emit("game:quiz:set", { quiz: game.quiz });
        game.players.push({
          uuid: socket.uuid,
          username: socket.username,
          socket: socket,
          answered: true,
          isHost: false,
          answers: [],
          points: 0,
          dbid: socket.handshake.auth['dbid'] || undefined,
        });
        io.to(gameId).emit("player:list", getPlayersList(game));
        if (game.quiz)
          socket.emit("game:quiz", game.quiz);
        cb(gameId, undefined);
        console.log(`Player ${socket.username} (${socket.uuid}) joined game ${gameId}`);
      } else {
        cb(undefined, "Nie znaleziono gry o podanym ID");
      }
    });

    socket.on("game:create", async (quizId: number | undefined, cb: SocketCallback<[string]>) => {
      console.log(`Creating game for ${socket.username} (${socket.uuid}) with quizId: ${quizId}`);
      var gameId = generateRandomString(7);
      while (Object.keys(gameData).includes(gameId)) {
        console.log(`Game ID ${gameId} already exists, generating a new one...`);
        gameId = generateRandomString(7);
      }
      console.log(`Generated unique game ID: ${gameId}`);
      var game: GameData = {
        host: {
          uuid: socket.uuid,
          username: socket.username,
          socket: socket,
          answered: true,
          isHost: true,
          answers: [],
          points: 0,
          dbid: socket.handshake.auth['dbid'] || undefined,
        },
        players: [],
        quizId: quizId,
        state: "waiting",
        quiz: null,
        questionOrder: [],
        currentQuestion: -1,
      };
      game.players.push(game.host);
      const quiz = await setQuiz(game, quizId);
      gameData[gameId] = game;
      socket.join(gameId);
      socket.gameId = gameId;
      socket.host = true;
      cb(gameId);
      io.to(gameId).emit("player:list", getPlayersList(game));
      if (quiz)
        socket.emit("game:quiz", quiz);
      console.log(`Game created: ${gameId} by ${socket.username} (${socket.uuid})`);
    });

    socket.on("game:quiz:set", async (quizId: number, cb: SocketCallback<[string?]>) => {
      if (socket.host && socket.gameId && gameData[socket.gameId]) {
        const quiz = await setQuiz(gameData[socket.gameId], quizId);
        if (quiz) {
          io.to(socket.gameId).emit("game:quiz", quiz);
        } else {
          cb("Nie znaleziono quizu o podanym ID");
        }
      } else {
        cb("Nie jesteś gospodarzem gry lub gra nie istnieje");
      }
    });

    socket.on("game:quiz:get", () => {
      if (socket.gameId && gameData[socket.gameId]) {
        const game = gameData[socket.gameId];
        if (game.quiz) {
          socket.emit("game:quiz", game.quiz);
        }
      }
    })

    socket.on("disconnect", () => {
      if (socket.gameId && gameData[socket.gameId]) {
        const game = gameData[socket.gameId];
        game.players = game.players.filter(player => player.socket !== socket);
        io.to(socket.gameId).emit("player:list", getPlayersList(gameData[socket.gameId]));
        if (game.host.socket === socket) {
          if (game.players.length > 0) {
            const newHost = game.players[0];
            newHost.isHost = true;
            game.host = newHost;
            newHost.socket.host = true;
            console.log(`Host ${socket.username} (${socket.uuid}) disconnected, transferring host to ${newHost.username} (${newHost.uuid})`);
            newHost.socket.emit("game:host:changed", newHost.uuid, newHost.username);
          }
          else {
            console.log(`Host ${socket.username} (${socket.uuid}) disconnected, no more players, removing game ${socket.gameId}`);
            delete gameData[socket.gameId];
            socket.broadcast.to(socket.gameId).emit("game:exit");
          }
        }
      }
      console.log(`Player disconnected: ${socket.username} (${socket.uuid})`);
    });

    socket.on("player:setname", (name: string) => {
      if (gameData[socket.gameId])
        socket.broadcast.to(socket.gameId).emit("player:list", getPlayersList(gameData[socket.gameId]));
      socket.username = name;
      if (gameData[socket.gameId]) {
        const game = gameData[socket.gameId];
        if (game.host.socket === socket) {
          game.host.username = name;
        } else {
          const player = game.players.find(p => p.socket === socket);
          if (player) {
            player.username = name;
          }
        }
      }
    });

    socket.on("game:question:next", async () => {
      console.log(`Next question requested by ${socket.username} (${socket.uuid}) in game ${socket.gameId}`);
      var game: GameData;
      if (socket.host && (game = gameData[socket.gameId])) {
        if (!game.quiz) {
          console.log(`No quiz set for game ${socket.gameId}`);
          return;
        }
        io.to(socket.gameId).emit("game:ranking", getRanking(game));
        game.players.forEach(player => player.answered = false);
        if (game.state !== "playing") {
          var gameRecord = await prisma.game.create({
            data: {
              started_at: new Date(),
              quiz_id: game.quiz.id,
              host_id: game.host.dbid,
            }
          })
          game.gameId = gameRecord.id;
          game.players.forEach(async (player) => {
            const playerRecord = await prisma.game_player.create({
              data: {
                game_id: gameRecord.id,
                user_id: player.dbid,
                guest_name: player.username,
                played_at: new Date(),
                score: player.points,
                is_host: player.isHost,
              }
            });
            player.gamePlayerId = playerRecord.id;
          });

          game.state = "playing";
          game.currentQuestion = 0;
          io.to(socket.gameId).emit("game:state", game.state, game.questionOrder[game.currentQuestion], game.currentQuestion + 1);
          console.log(`Game ${socket.gameId} started with question ${game.questionOrder[game.currentQuestion]}`);
        } else {
          if (game.currentQuestion < game.questionOrder.length - 1) {
            game.currentQuestion++;
            io.to(socket.gameId).emit("game:state", game.state, game.questionOrder[game.currentQuestion], game.currentQuestion + 1);
            console.log(`Next question in game ${socket.gameId}: ${game.questionOrder[game.currentQuestion]}`);
          } else {
            await prisma.game.update({
              where: { id: game.gameId },
              data: {
                finished_at: new Date(),
              }
            });
            game.players.forEach(async (player) => {
              await prisma.game_player.update({
                where: { id: player.gamePlayerId },
                data: {
                  score: player.points,
                }
              });
            });
            game.state = "finished";
            io.to(socket.gameId).emit("game:state", game.state);
            console.log(`Game ${socket.gameId} finished`);
          }
        }
      } else {
      }
    });

    socket.on("game:question:answer", async (questionIdx: number, answer: number, cb: SocketCallback<[number]>) => {
      console.log(`Answer received from ${socket.username} (${socket.uuid}) in game ${socket.gameId}: Question ${questionIdx}, Answer ${answer}`);
      if (socket.gameId && gameData[socket.gameId]) {
        const game = gameData[socket.gameId];
        if (game.state === "playing" && game.quiz) {
          const player = game.players.find(p => p.socket === socket);
          if (player) {
            if (!player.answers) {
              player.answers = [];
            }
            player.answers[questionIdx] = answer;
            console.log(`Player ${player.username} answered question ${questionIdx} with answer ${answer}`);
            io.to(socket.gameId).emit("game:question:distribution", getAnswersDistribution(game, questionIdx));
            const question = game.quiz.Question[questionIdx];
            const answerItem = question.Answer.find(a => a.id === answer);
            player.answered = true;
            var points = Math.round((question.partial_points ? question.max_points / question.Answer.filter(a => a.is_correct).length : question.max_points) * 100) / 100;
            if (answerItem && answerItem.is_correct) {
              player.points += points;
              console.log(`Player ${player.username} earned ${points} points for question ${questionIdx}`);
              cb(points);
            } else {
              player.points -= question.negative_points ? points : 0;
              console.log(`Player ${player.username} answered question ${questionIdx} incorrectly`);
              cb(0);
            }
            await prisma.game_player.update({
              where: { id: player.gamePlayerId },
              data: {
                score: player.points,
              }
            });
          }
        } else {
          console.log(`Game ${socket.gameId} is not in playing state`);
        }
      } else {
        console.log(`Game ${socket.gameId} not found`);
      }
    });
  });
}