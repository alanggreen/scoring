define('directives/datatable',[
    'directives/ng-directives',
],function(module) {
    return module.directive('ngDatatable',['$timeout', '$document', function($timeout, $document) {
        return {
            restrict: 'E',
            scope: {},
            link: function(scope, element, attrs) {
                var doNothing = () => {};
                var returnTrue = () => true;
                var returnEmptyString = () => '';

                var attrConfig = scope.$parent.$eval(attrs.config);

                function calcConfig(conf) {
                    if(!conf)   return;

                    scope.config = {
                        tableClasses: conf.tableClasses || '',
                        columns: conf.columns.map(column => {
                            var newColumn = {
                                field: column.field,
                                header: column.header,
                                edit: column.edit || false,
                                show: column.show || returnTrue,
                                onCellClick: column.onCellClick,
                                value: column.value
                            };
                            if(!newColumn.value) {
                                newColumn.value = item => item[column.field]
                            }
                            if(newColumn.edit) {
                                newColumn.writeField = column.writeField || column.field;
                                if(newColumn.edit === 'options' || newColumn.edit === 'complex_options') {
                                    newColumn.options = column.options.map(option => {
                                        if(typeof option === String) {
                                            return { value: option, text: option };
                                        } else {
                                            return { value: option.value, text: option.text };
                                        }
                                    });
                                    if(newColumn.edit === 'complex_options') {
                                        newColumn.onChange = column.onChange || doNothing;
                                    }
                                }
                            }
                            return newColumn;
                        }),
                        actions: conf.actions ? conf.actions.map(action => {
                            if(action.requireLoading) {
                                var onClick = (item) => {
                                    load();
                                    action.onClick(item);
                                };
                            } else {
                                var onClick = action.onClick || doNothing;
                            }
                            return {
                                onClick: onClick,
                                show: action.show || returnTrue,
                                classes: action.classes || returnEmptyString,
                                icon: action.icon || '',
                                tooltip: action.tooltip || ''
                            };
                        }) : [],
                        row: {
                            classes: conf.row ? (conf.row.classes || returnEmptyString) : returnEmptyString,
                            show: conf.row ? (conf.row.show || returnTrue) : returnTrue
                        },
                        sort: conf.sort,
                        search: conf.search || returnEmptyString,
                    };
                }
                calcConfig(attrConfig);

                scope.collection = () => {
                    $timeout(() => element.removeClass('dimmed'), 0, false);
                    var collection = (scope.$parent.$eval(attrs.collection) || []);
                    scope.collectionLength = collection.length;
                    return collection;
                };

                scope.sort = {
                    column: scope.config.columns[attrConfig.sort || 0],
                    reverse: attrConfig.reverse || false,
                    get: () => attrConfig.sort || scope.sort.column.field,
                    set: (column) => {
                        if(scope.sort.disabled) {
                            return;
                        }
                        if(scope.sort.column === column) {
                            scope.sort.reverse = !scope.sort.reverse;
                        } else {
                            scope.sort.column = column;
                        }
                    },
                    icon: (column) => {
                        if(scope.sort.disabled || scope.sort.column !== column) {
                            return '';
                        }
                        if (scope.sort.reverse) {
                            return 'arrow_drop_down';
                        } else {
                            return 'arrow_drop_up';
                        }
                    },
                    disabled: attrConfig.sort !== undefined,
                };

                if(attrConfig.edit) {
                    scope.edit = {
                        is: (item, column) =>  scope.edit.editing && scope.edit.editing.item === item && scope.edit.editing.column === column,
                        start: (item, column) => {
                            if(column.edit) {
                                scope.edit.editing = { item: item, column: column, originalValue: angular.copy(item[column.field]) }
                                $timeout(() => {
                                    let classes = (attrConfig.create && item === scope.create.newItem) ? scope.create.classes() : scope.config.row.classes(item)
                                    angular.element(`ng-datatable#${attrConfig.id} tbody tr${classes ? `.${classes}` : '' } td.${column.field} .${column.edit}`).focus();
                                });
                            }
                        },
                        save: () => {
                            if(!scope.create || scope.edit.editing.item !== scope.create.newItem && attrConfig.edit.onSave) {
                                attrConfig.edit.onSave(scope.edit.editing.item, scope.edit.editing.column, scope.edit.editing.originalValue, scope.edit.editing.item[scope.edit.editing.column.field]);
                            }
                            scope.edit.editing = undefined;
                        },
                        saveAndGoToNextInput: () => {
                            let item = scope.edit.editing.item;
                            let currentColumn = scope.edit.editing.column;
                            let nextColumnIndex = scope.config.columns.indexOf(currentColumn) + 1;
                            let nextColumn = scope.config.columns[nextColumnIndex];
                            scope.edit.save();
                            scope.onCellClick(item, nextColumn);
                        },
                        cancel: () => {
                            if(!scope.create || scope.edit.editing.item !== scope.create.newItem) {
                                scope.edit.editing.item[scope.edit.editing.column.field] = scope.edit.editing.originalValue;
                                if(attrConfig.edit.onCancel) {
                                    attrConfig.edit.onCancel(scope.edit.editing.item, scope.edit.editing.column, scope.edit.editing.originalValue);
                                }
                            }
                            scope.edit.editing = undefined;
                        }
                    };
                } else {
                    scope.edit = false;
                }

                if(attrConfig.create && attrConfig.edit) {
                    scope.create = {
                        classes: attrConfig.create.classes || (() => 'create'),
                        show: attrConfig.create.show || returnTrue,
                        message: attrConfig.create.message || '',
                        disableMessage: () => {
                            scope.create.showMessage = false;
                            $timeout(() => {
                                scope.onCellClick(scope.create.newItem, scope.config.columns[0]);
                            });
                        },
                        reset: () => {
                            scope.create.showMessage = true;
                            scope.create.newItem = {};
                            scope.config.columns.forEach((column) => scope.create.newItem[column.key] = '');
                        },
                        save: () => {
                            load();
                            if(attrConfig.create.save) {
                                attrConfig.create.save(scope.create.newItem);
                            }
                            scope.create.reset();
                        }
                    }
                    scope.create.reset();
                } else {
                    scope.create = false;
                }

                scope.onCellClick = function(item, column) {
                    if(column.onCellClick) {
                        load();
                        column.onCellClick(item);
                    } else if(scope.edit && !scope.edit.is(item, column)) {
                        scope.edit.start(item, column);
                    }
                };

                function load() {
                    element.addClass('dimmed');
                }

                scope.scroll = (function() {
                    if(attrConfig.scrollCount) {
                        var _currentScroll = attrConfig.scrollCount;

                        var body = jQuery(element).find('tbody');

                        function continueScroll() {
                            if(body[0].scrollTop + body[0].offsetHeight + body.children().first().height() > body[0].scrollHeight) {
                                _currentScroll += attrConfig.scrollCount;
                                scope.$digest();
                            }
                            if(_currentScroll > scope.collectionLength) {
                                body.off('scroll');
                            }
                        }

                        body.on('scroll', continueScroll);

                        return () => _currentScroll;
                    } else {
                        // We assume the collection will not double itself
                        let maxSize = attrConfig.scrollMaxSize || 2 * scope.collection().length;
                        return () => maxSize;
                    }
                })();

                scope.$watch(() => scope.$parent.$eval(attrs.config), (newConfig) => calcConfig(newConfig), true);
                $timeout(() => {
                    element.removeClass('dimmed')
                }, 0, false);

                element.addClass('dimmable dimmed');
            },
            templateUrl: 'js/directives/datatable.html'
        };
    }]);
});
