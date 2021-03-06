describe('ng-teams',function() {
    var ngServices = factory('services/ng-services');
    var module = factory('services/ng-teams',{
        'services/ng-services': ngServices,
        'services/log': logMock
    });

    var $teams;
    var rawMockTeam = { number: "123", name: "Oefenrondes", cityState: "foo" };
    var rawMockTeam2 = { number: "123", name: "Oefenrondes", translationNeeded: true };
    var savedMockTeam = {
        number: 123,
        name: "Oefenrondes",
        affiliation: "",
        cityState: "foo",
        country: "",
        coach1: "",
        coach2: "",
        judgingGroup: "",
        pitLocation: "",
        translationNeeded: false
    };
    var mockTeam = {
        index: 0,
        number: 123,
        name: "Oefenrondes",
        affiliation: "",
        cityState: "foo",
        country: "",
        coach1: "",
        coach2: "",
        judgingGroup: "",
        pitLocation: "",
        translationNeeded: false
    };
    var mockTeam2 = {
        index: 0,
        number: 123,
        name: "Oefenrondes",
        affiliation: "",
        cityState: "",
        country: "",
        coach1: "",
        coach2: "",
        judgingGroup: "",
        pitLocation: "",
        translationNeeded: true
    };
    var fsMock;
    var httpMock;
    beforeEach(function() {
        angular.mock.module(module.name);
        httpMock = createHttpMock({
            get: {
                '/teams': { data: [savedMockTeam] }
            },
            post: {
                '/teams/save': {teams:[savedMockTeam]}
            }
        });
        angular.mock.module(function($provide) {
            $provide.value('$http', httpMock);
        });
        angular.mock.inject(["$teams", function(_$teams_) {
            $teams = _$teams_;
        }]);
    });

    describe('initializing',function() {
        beforeEach(function(done){
            $teams.init().then(()=>{done();});
        });

        it('should load teams by default', function() {
            expect($teams.teams).toEqual([mockTeam]);
        });
    });

    describe('save',function() {
        it('should write teams to teams.json',function(done) {
            return $teams.save().then(function() {
                expect(httpMock.post).toHaveBeenCalledWith('/teams/save',{teams: [savedMockTeam]});
                done();
            });
        });

        it('should log an error if writing fails',function(done) {
            httpMock.post.and.returnValue(Q.reject('foo'));
            return $teams.save().then(function() {
                expect(logMock).toHaveBeenCalledWith('Teams write error','foo');
                done();
            });
        });
    });

    describe('load', function() {
        beforeEach((done) => $teams.init().then(() => done(), (err) => { console.error(err); done(); }));
        it('should load and sanitize teams',function(done) {
            $teams.clear();
            httpMock.addResponse('get','/teams',{data: [savedMockTeam]});
            return $teams.load().then(function() {
                expect($teams.teams).toEqual([mockTeam]);
                done();
            }, (err) => {
                console.error(err);
                done();
            });
        });

        it('should log an error if loading fails',function(done) {
            httpMock.get.and.returnValue(Q.reject('foo'));
            return $teams.load().then(function() {
                expect(logMock).toHaveBeenCalledWith('teams read error','foo');
                done();
            });
        });
    });

    describe('remove',function() {

        beforeEach((done) => $teams.init().then(() => done(), (err) => { console.error(err); done(); }));

        it('should remove the provided id',function() {
            expect($teams.teams).toEqual([mockTeam]);
            $teams.remove(123);
            expect($teams.teams).toEqual([]);
        });

        it('should not remove the team if not found',function() {
            expect($teams.teams).toEqual([mockTeam]);
            $teams.remove(42);
            expect($teams.teams).toEqual([mockTeam]);
        });
    });

    describe('add',function() {
        it('should add a team to the list and add autogen properties',function() {
            $teams.clear();
            var res = $teams.add(rawMockTeam);
            expect($teams.teams).toEqual([mockTeam]);
        });
        it('should add a team to the list and add autogen properties',function() {
            $teams.clear();
            var res = $teams.add(rawMockTeam2);
            expect($teams.teams).toEqual([mockTeam2]);
        });
        it('should reject duplicate team ids',function() {
            $teams.clear();
            $teams.add(rawMockTeam);
            expect(function() {
                $teams.add(rawMockTeam);
            }).toThrow();
        });
        it('should maintain existing teams array', function() {
            $teams.clear();
            var teams = $teams.teams;
            expect(teams).toEqual([]);
            $teams.add(rawMockTeam);
            expect(teams).toEqual([mockTeam]);
        });
    });

    describe('get',function() {
        beforeEach((done) => $teams.init().then(() => done(), (err) => { console.error(err); done(); }));
        it('should get a sanitized team', function() {
            expect($teams.get(123)).toEqual(mockTeam);
        });
    });

    describe('_update',function() {
        it('should throw an error if team is present twice',function() {
            $teams._rawTeams = [rawMockTeam,rawMockTeam];
            expect(function() {
                $teams._update();
            }).toThrowError('duplicate team number 123');
        });
    });
});
