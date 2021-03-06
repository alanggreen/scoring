define('views/scores', [
    'services/ng-scores',
    'angular',
    'angular-bootstrap'
], function () {
    var moduleName = 'scores';
    return angular.module(moduleName, ['ui.bootstrap']).controller(moduleName + 'Ctrl', [
        '$scope', '$scores', '$teams', '$stages', '$settings', '$window',
        function ($scope, $scores, $teams, $stages, $settings, $window) {
            $scope.initPage(moduleName, $scope);

            $scope.scoresTableConfig = {
                columns: [
                    { field: 'index', header: '#', edit: false },
                    { field: 'teamNumber', header: 'team', edit: 'options', options: [], writeField: 'teamNumber', show: (score) => !score.showError },
                    { field: 'teamFullName', header: 'team', edit: 'options', options: [], writeField: 'teamNumber', show: (score) => !score.showError },
                    { field: 'match', header: 'match', edit: 'complex_options', options: [], onChange: (score) => {
                            let split = score.match.split(' #');
                            let stage = $scope.stages.find(stage => stage.name === split[0]);
                            score.stageId = stage ? stage.id : undefined;
                            score.round = parseInt(split[1]);
                        }
                        , show: (score) => !score.showError
                    },
                    { field: 'referee', header: 'referee', edit: 'options', options: [], writeField: 'referee', show: (score) => !score.showError },
                    { field: 'table', header: 'table', edit: 'options', options: [], writeField: 'table', show: (score) => !score.showError },
                    { field: 'score', header: 'score', edit: 'text', writeField: 'score', show: (score) => !score.showError },
                    { field: 'error', show: (score) => score.showError, value: (score) => score.error ? score.error.message : '' }
                ],
                actions: [
                    {
                        onClick: (score) => {
                            score.showError = !score.showError
                        },
                        classes: () => 'btn-danger',
                        show: (score) => score.error,
                        icon: 'error',
                        tooltip: 'show error'
                    }, {
                        onClick: (score) => {
                            togglePublished(score);
                        },
                        show: (score) => score.published,
                        icon: 'remove_circle_outline',
                        tooltip: 'unpublish'
                    }, {
                        onClick: (score) => {
                            togglePublished(score);
                        },
                        show: (score) => !score.published,
                        icon: 'add_circle_outline',
                        tooltip: 'publish'
                    }, {
                        onClick: (score) => {
                            $scope.goTo('scoresheet', $scoresheet => {
                                $scoresheet.loadScoresheet(score);
                                $scoresheet.moveOn('missions');
                            });
                        },
                        icon: 'edit',
                        tooltip: 'edit in scoresheet'
                    }, {
                        onClick: (score) => {
                            if(confirm('Are you sure you want to delete this score? This cannot be undone.')) {
                                $scores.delete(score).then(() => {
                                    $scope.errors = $scores.validationErrors;
                                });
                            }
                        },
                        classes: () => 'btn-danger',
                        icon: 'delete',
                        tooltip: 'delete'
                    }
                ],
                edit: {
                    onSave: (score) => {
                        $scores.update(score).then(() => {
                            $scope.errors = $scores.validationErrors;
                        });
                    }
                },
                row: {
                    classes: (score) => `score_${score.index}`
                },
                search : () => $scope.scoresTableConfig.searchValue,
                searchValue: '',
                onlyErrors: false,
                onlyUnpublished: false,
                scrollCount: 20
            };

            $scope.ranksTableConfig = {
                columns: [
                    { field: 'rank', header: 'ranking' },
                    { field: 'teamNumber', header: 'team' },
                    { field: 'teamFullName', header: 'team' },
                    { field: 'highScore', header: 'high' }
                ],
                actions: [],
                row: {
                    classes: (rank) => `rank_${rank.index}`
                },
                sort: false,
                view: undefined,
                scrollCount: 20
            };

            $scope.showOnlyUnpublishedButton = function() {
                return $scope.scores.some(score => !score.published);
            };

            $scope.showOnlyErrorButton = function() {
                return $scope.scores.some(score => score.error);
            };

            $scope.filteredScores = function() {
                return $scope.scores.filter(score => (!$scope.scoresTableConfig.onlyErrors || score.error) && (!$scope.scoresTableConfig.onlyUnpublished || score.published === false))
            };

            $scope.$watch(() => $scores.scores, function () {
                $scope.scores = formatScores($scores.scores);
            }, true);

            $scope.$watch(() => $teams.teams, function (newValue, oldValue) {
                if (newValue !== oldValue && indexIsTeamNum(newValue)) {
                    $scope.scores.forEach(function (score) {
                        score.team = $teams.get(score.teamNumber);
                    });
                    $scores._update();
                }

                $scope.scoresTableConfig.columns[1].options = $teams.teams.map(team => { return { value: team.number, text: team.number }; });
                $scope.scoresTableConfig.columns[2].options = $teams.teams.map(team => { return { value: team.number, text: `#${team.number} ${team.name}` }; });
            }, true);

            $scope.$watch(() => $scores.scoreboard, function () {
                $scope.scoreboard = formatRanks($scores.scoreboard);
            }, true);

            $scope.calcRanksColumns = function() {
                let stage = $stages.get($scope.ranksTableConfig.view);
                $scope.ranksTableConfig.columns = $scope.ranksTableConfig.columns.filter(column => !column.field.startsWith('round'));
                for(var i = 1; i <= stage.rounds; i++) {
                    $scope.ranksTableConfig.columns.push({ field: `round_` + i, header: i });
                }
            };

            function indexIsTeamNum(teamMap) {
                return !Object.keys(teamMap).some((key)=>{
                    return `${teamMap[key].number}` !== key;
                });
            }

            $scores.init().then(function() {
                $scope.stages = $stages.stages;
                $scope.scores = formatScores($scores.scores);

                $scope.scoresTableConfig.columns[1].options = $teams.teams.map(team => { return { value: team.number, text: team.number }; });
                $scope.scoresTableConfig.columns[2].options = $teams.teams.map(team => { return { value: team.number, text: `#${team.number} ${team.name}` }; });
                $scope.stages.forEach(stage => {
                    for(var round = 1; round <= stage.rounds; round++) {
                        let match = `${stage.name} #${round}`;
                        $scope.scoresTableConfig.columns[3].options.push({ value: match, text: match });
                    }
                });
                $scope.scoresTableConfig.columns[4].options = $settings.settings.referees.map(ref => { return { value: ref.name, text: ref.name }; });
                $scope.scoresTableConfig.columns[5].options = $settings.settings.tables.map(table => { return { value: table.name, text: table.name }; });

                $scope.ranksTableConfig.view = $settings.settings.currentStage || $scope.stages[0].id;
                $scope.calcRanksColumns();
                $scores.getRankings().then(() => {
                    $scope.errors = $scores.validationErrors;
                });
            });

            function togglePublished(score) {
                score.published = !score.published;
                saveScore(score, true);
            };

            $scope.broadcastRanking = function() {
                $scores.broadcastRanking($stages.get($scope.ranksTableConfig.view));
            };

            $scope.downloadCurrentStage = function() {
                var downloadLink = angular.element('<a></a>');
                downloadLink.attr('href', currentStageExportableDataLink());
                downloadLink.attr('download', `ranking_${$stages.get($scope.ranksTableConfig.view).name}.csv`);
                downloadLink[0].click();
            }

            function saveScore(score, forceAutoBroadcast) {
                try {
                    $scores.update(score, forceAutoBroadcast).then(() => {
                        $scope.errors = $scores.validationErrors;
                    });
                } catch(e) {
                    $window.alert("Error updating score: " + e);
                }
            }

            function formatScores(scores) {
                return scores.map((score, index) => {
                    var formattedScore = {};
                    for(var key in score) formattedScore[key] = score[key];
                    formattedScore.index = index + 1;
                    formattedScore.team = $teams.get(score.teamNumber);
                    formattedScore.stage = $stages.get(score.stageId);

                    if(formattedScore.team) {
                        formattedScore.teamFullName = `#${formattedScore.team.number} ${formattedScore.team.name}`;
                    }
                    if(formattedScore.stage) {
                        formattedScore.match = `${formattedScore.stage.name} #${formattedScore.round}`;
                    }
                    return formattedScore;
                });
            }

            function formatRanks(scoreboard) {
                let result = {};
                for(let stageId in scoreboard) {
                    let stage = scoreboard[stageId];
                    result[stageId] = stage.filter((rank, index) => {
                        rank.index = index;
                        rank.teamNumber = rank.team.number;
                        rank.teamFullName = `#${rank.team.number} ${rank.team.name}`;
                        rank.highScore = rank.highest ? rank.highest.score : undefined;
                        return rank.scores.filter((score, index) => {
                            if(score) {
                                rank[`round_${index+1}`] = score.score;
                                return true;
                            } else {
                                return false;
                            }
                        }).length !== 0;
                    });
                }

                return result;
            }

            function currentStageExportableDataLink() {
                 var data = $scope.scoreboard[$scope.ranksTableConfig.view]
                     .map(teamEntry =>
                        [teamEntry.rank, teamEntry.team.number, teamEntry.team.name, teamEntry.highest.score]
                        .concat(teamEntry.scores.map(scoreObject => scoreObject ? scoreObject.score : 0)));

                return `data:text/csv;charset=utf-8,${ encodeURIComponent(encodeArray(data)) }`;
            }

            function encodeArray(array) {
                var string = "";
                var settings = $settings.settings;
                array.forEach(function (row) {
                    row = row.map((elem) => elem || elem === 0 ? String(elem) : "");
                    string = string.concat(settings.lineStartString);
                    string = string.concat(row.join(settings.separatorString));
                    string = string.concat((settings.lineEndString) + "\r\n");
                });
                return string;
            }

        }]);
});
