document.addEventListener('DOMContentLoaded', function() {
    // Глобальная переменная для истории маршрутов
    let routeHistory = [];
    let startLocationInfo = null;

    // Элементы интерфейса
    const screens = {
        initial: document.getElementById('initialScreen'),
        orderForm: document.getElementById('orderFormScreen'),
        orderList: document.getElementById('orderListScreen'),
        routeExecution: document.getElementById('routeExecutionScreen'),
        routeCompletion: document.getElementById('routeCompletionScreen'),
        routeHistory: document.getElementById('routeHistoryScreen')
    };

    // Кнопки
    const addOrderBtns = {
        initial: document.getElementById('addOrderBtn'),
        form: document.getElementById('formAddOrderBtn'),
        list: document.getElementById('listAddOrderBtn')
    };

    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const startRouteBtn = document.getElementById('startRouteBtn');
    const finishRouteBtn = document.getElementById('finishRouteBtn');
    const okBtn = document.getElementById('okBtn');
    const showHistoryBtn = document.getElementById('showHistoryBtn');
    const backToMainBtn = document.getElementById('backToMainBtn');

    // Поля формы
    const clientAddressInput = document.getElementById('clientAddress');
    const orderWeightInput = document.getElementById('orderWeight');
    const highPriceDeliveryCheckbox = document.getElementById('highPriceDelivery');
    const addressSuggestions = document.getElementById('addressSuggestions');
    const startLocationInput = document.getElementById('startLocation');
    const startLocationSuggestions = document.getElementById('startLocationSuggestions');
    const setStartLocationBtn = document.getElementById('setStartLocationBtn');

    // Контейнеры для списков заказов
    const orderList = document.getElementById('orderList');
    const executionOrderList = document.getElementById('executionOrderList');
    const routeHistoryList = document.getElementById('routeHistoryList');

    // Элементы экрана завершения
    const executionTimeElement = document.getElementById('executionTime');
    const totalIncomeElement = document.getElementById('totalIncome');

    // Данные приложения
    let orders = [];
    let routeStartTime = null;
    let nextOrderId = 1;
    let startLocation = null;
    const API_KEY = '5b3ce3597851110001cf624892de0fe27ec54ee0afc5e65a6fff3c5c'; // Замените на свой ключ API

    // Функции для работы с модальными окнами
    function showAlert(message) {
        const modal = document.getElementById('alertModal');
        const messageElement = document.getElementById('alertMessage');
        const okButton = document.getElementById('alertOkBtn');

        messageElement.textContent = message;
        modal.classList.remove('hidden');

        return new Promise(resolve => {
            okButton.onclick = () => {
                modal.classList.add('hidden');
                resolve();
            };
        });
    }

    function showConfirm(message) {
        const modal = document.getElementById('confirmModal');
        const messageElement = document.getElementById('confirmMessage');
        const yesButton = document.getElementById('confirmYesBtn');
        const noButton = document.getElementById('confirmNoBtn');

        messageElement.textContent = message;
        modal.classList.remove('hidden');

        return new Promise(resolve => {
            yesButton.onclick = () => {
                modal.classList.add('hidden');
                resolve(true);
            };
            noButton.onclick = () => {
                modal.classList.add('hidden');
                resolve(false);
            };
        });
    }

    // Загрузка истории маршрутов
    function loadRouteHistory() {
        // В начале функции loadRouteHistory или в инициализации приложения
        function checkForUnfinishedRoute() {
            const savedStartTime = localStorage.getItem('currentRouteStartTime');
            if (savedStartTime) {
                const startTime = new Date(savedStartTime);
                const now = new Date();
                const diff = now - startTime;

                // Если прошло менее 24 часов, предлагаем восстановить маршрут
                if (diff < 24 * 60 * 60 * 1000) {
                    return showConfirm(`Обнаружен незавершенный маршрут, начатый ${startTime.toLocaleString()}. Восстановить?`)
                        .then(result => {
                            if (result) {
                                routeStartTime = startTime;
                                showScreen('routeExecution');
                                return true;
                            } else {
                                localStorage.removeItem('currentRouteStartTime');
                                return false;
                            }
                        });
                } else {
                    localStorage.removeItem('currentRouteStartTime');
                }
            }
            return Promise.resolve(false);
        }

        // Вызываем эту функцию при загрузке приложения
        document.addEventListener('DOMContentLoaded', function() {
            loadRouteHistory();
            if (!checkForUnfinishedRoute()) {
                showScreen('initial');
            }
        });

        const savedHistory = localStorage.getItem('routeHistory');
        if (savedHistory) {
            try {
                routeHistory = JSON.parse(savedHistory);

                // Преобразуем строковые даты обратно в объекты Date
                routeHistory.forEach(route => {
                    route.date = new Date(route.date);
                    route.startTime = new Date(route.startTime);
                    route.endTime = new Date(route.endTime);
                });

                console.log('История маршрутов загружена:', routeHistory);
            } catch (error) {
                console.error('Ошибка при загрузке истории маршрутов:', error);
                routeHistory = [];
            }
        }
    }

    // Функция для отображения истории маршрутов
    function renderRouteHistory() {
        routeHistoryList.innerHTML = '';

        // Группируем маршруты по датам (по дням)
        const groupedRoutes = {};

        routeHistory.forEach(route => {
            const dateKey = route.date.toLocaleDateString();
            if (!groupedRoutes[dateKey]) {
                groupedRoutes[dateKey] = {
                    routes: [],
                    totalIncome: 0
                };
            }
            groupedRoutes[dateKey].routes.push(route);
            groupedRoutes[dateKey].totalIncome += route.income;
        });

        // Отображаем маршруты, сгруппированные по датам
        Object.keys(groupedRoutes).sort((a, b) => {
            return new Date(b) - new Date(a); // Сортировка по убыванию дат
        }).forEach(dateKey => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `
                <div class="date-info">
                    <span class="date-text">${dateKey}</span>
                    <span class="date-income">Заработок: ${groupedRoutes[dateKey].totalIncome}₽</span>
                </div>
                <div class="date-toggle">▼</div>
            `;
            dateGroup.appendChild(dateHeader);

            const routesContainer = document.createElement('div');
            routesContainer.className = 'routes-container hidden';

            groupedRoutes[dateKey].routes.forEach(route => {
                const routeItem = document.createElement('div');
                routeItem.className = 'route-item';

                const routeHeader = document.createElement('div');
                routeHeader.className = 'route-header';
                routeHeader.innerHTML = `
                    <span>Маршрут #${route.id}</span>
                    <span>${route.executionTime}</span>
                    <span>${route.income}₽</span>
                `;

                const routeDetails = document.createElement('div');
                routeDetails.className = 'route-details hidden';

                // Отображаем все заказы в маршруте
                route.orders.forEach(order => {
                    const orderElement = document.createElement('div');
                    orderElement.className = 'history-order-item';
                    orderElement.innerHTML = `
                        <div class="order-info">
                            <span>№${order.id}</span>
                            <span>${order.address}</span>
                            <span>${order.weight}кг</span>
                            <span>${order.price}₽</span>
                        </div>
                        <div class="order-distance">
                            <span>Расстояние: ${order.distance} км</span>
                        </div>
                    `;
                    routeDetails.appendChild(orderElement);
                });

                routeItem.appendChild(routeHeader);
                routeItem.appendChild(routeDetails);

                // Обработчик клика по заголовку маршрута
                routeHeader.addEventListener('click', () => {
                    routeDetails.classList.toggle('hidden');
                });

                routesContainer.appendChild(routeItem);
            });

            dateGroup.appendChild(routesContainer);

            // Обработчик клика по заголовку даты
            dateHeader.addEventListener('click', () => {
                routesContainer.classList.toggle('hidden');
                const toggle = dateHeader.querySelector('.date-toggle');
                toggle.textContent = routesContainer.classList.contains('hidden') ? '▼' : '▲';
            });

            routeHistoryList.appendChild(dateGroup);
        });
    }

    // Функции для переключения экранов
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        if (screens[screenId]) screens[screenId].classList.remove('hidden');
    }

    // Расчет цены заказа
    function calculatePrice(weight, distance, isHighPriceDelivery = false) {
        const pickupPrice = 63;
        const deliveryPrice = isHighPriceDelivery ? 110: 86;
        const weightPrice = weight * 2;
        const distancePrice = distance * 18;

        return Math.round(pickupPrice + deliveryPrice + weightPrice + distancePrice);
    }

    // Функция для геокодирования адреса с подробной обработкой ошибок
    async function geocodeAddress(address) {
        try {
            console.log(`Отправка запроса геокодирования для адреса: ${address}`);

            // Добавляем задержку между запросами (минимум 1 секунда)
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
                headers: {
                    // Обязательно указываем User-Agent с названием приложения и контактной информацией
                    'User-Agent': 'CourierApp/1.0 (your-email@example.com)'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Ошибка HTTP при геокодировании: ${response.status} ${response.statusText}`);
                console.error(`Ответ сервера: ${errorText}`);
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ геокодирования:', data);

            if (!data || data.length === 0) {
                console.warn('Геокодирование не вернуло результатов');
                return null;
            }

            // Nominatim возвращает координаты в формате [lat, lon], но нам нужно [lon, lat]
            const coordinates = [parseFloat(data[0].lon),
                parseFloat(data[0].lat)];
            console.log(`Найдены координаты: [${coordinates}]`);
            return coordinates;
        } catch (error) {
            console.error('Ошибка геокодирования:', error);
            alert(`Ошибка при геокодировании адреса: ${error.message}`);

            // Если API недоступен, возвращаем случайные координаты
            const randomCoords = [Math.random() * 10,
                Math.random() * 10];
            console.log(`Используем случайные координаты: [${randomCoords}]`);
            return randomCoords;
        }
    }

    // Функция для расчета расстояния между двумя точками
    async function calculateDistance(startCoords, endCoords) {
        try {
            console.log(`Расчет расстояния от [${startCoords}] до [${endCoords}]`);

            const body = {
                locations: [startCoords,
                    endCoords],
                metrics: ["distance"],
                units: "km"
            };

            console.log('Отправляемые данные:', JSON.stringify(body));

            const response = await fetch('https://api.openrouteservice.org/v2/matrix/foot-walking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': API_KEY
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Ошибка HTTP при расчете расстояния: ${response.status} ${response.statusText}`);
                console.error(`Ответ сервера: ${errorText}`);
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API расчета расстояния:', data);

            if (!data.distances || data.distances.length === 0 || !data.distances[0] || data.distances[0].length < 2) {
                console.warn('API вернул некорректные данные о расстоянии');
                throw new Error('Некорректные данные о расстоянии');
            }

            const distance = data.distances[0][1];
            console.log(`Рассчитанное расстояние: ${distance} км`);
            return distance;
        } catch (error) {
            console.error('Ошибка расчета расстояния:', error);
            alert(`Ошибка при расчете расстояния: ${error.message}`);

            // Если API недоступен, возвращаем случайное расстояние
            const randomDistance = Math.floor(Math.random() * 10) + 1;
            console.log(`Используем случайное расстояние: ${randomDistance} км`);
            return randomDistance;
        }
    }

// Загрузка стартовой точки при инициализации
function loadStartLocation() {
    const savedStartLocation = localStorage.getItem('startLocation');
    if (savedStartLocation) {
        try {
            startLocationInfo = JSON.parse(savedStartLocation);
            startLocation = startLocationInfo.coordinates;
            console.log(`Загружена стартовая точка: ${startLocationInfo.address} [${startLocation}]`);
        } catch (error) {
            console.error('Ошибка при загрузке стартовой точки:', error);
            startLocationInfo = null;
            startLocation = null;
        }
    }
}

// Обработчик для кнопки установки начальной точки


// Обработчик для кнопки сброса сессии
if (document.getElementById('resetSessionBtn')) {
    document.getElementById('resetSessionBtn').addEventListener('click', async () => {
        const confirmed = await showConfirm('Вы уверены, что хотите сбросить сессию? Это удалит стартовую точку и текущие заказы.');
        if (confirmed) {
            localStorage.removeItem('startLocation');
            startLocation = null;
            startLocationInfo = null;
            orders = [];
            routeStartTime = null;
            localStorage.removeItem('currentRouteStartTime');
            
            await showAlert('Сессия сброшена');
            showScreen('initial');
        }
    });
}

// Вызываем функцию загрузки стартовой точки при инициализации
document.addEventListener('DOMContentLoaded', function() {
    loadRouteHistory();
    loadStartLocation();
    if (!checkForUnfinishedRoute()) {
        showScreen('initial');
    }
});


    // Обработчики событий для кнопок добавления заказа
    Object.values(addOrderBtns).forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                showScreen('orderForm');
                clientAddressInput.focus();
            });
        }
    });

// Функция для получения подсказок адресов с использованием API OpenStreetMap
async function getAddressSuggestions(query) {
    if (query.length < 3) return [];
    
    try {
        // Добавляем задержку между запросами для соблюдения лимитов API
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`, {
            headers: {
                'User-Agent': 'CourierApp/1.0 (your-email@example.com)'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Преобразуем результаты в массив строк адресов
        const suggestions = data.features.map(feature => {
            const properties = feature.properties;
            let address = '';
            
            if (properties.name) address += properties.name;
            if (properties.street) {
                if (address) address += ', ';
                address += properties.street;
            }
            if (properties.housenumber) {
                address += ' ' + properties.housenumber;
            }
            if (properties.city) {
                if (address) address += ', ';
                address += properties.city;
            }
            if (properties.state) {
                if (address) address += ', ';
                address += properties.state;
            }
            if (properties.country) {
                if (address) address += ', ';
                address += properties.country;
            }
            
            return address;
        });
        
        return suggestions;
    } catch (error) {
        console.error('Ошибка при получении подсказок адресов:', error);
        return [];
    }
}

/*// Обновленная функция настройки подсказок для адреса
function setupAddressSuggestions(inputElement, suggestionsElement) {
    if (inputElement && suggestionsElement) {
        // Добавляем debounce для предотвращения слишком частых запросов
        let debounceTimer;
        
        inputElement.addEventListener('input', () => {
            const value = inputElement.value.trim();
            
            clearTimeout(debounceTimer);
            
            if (value.length > 2) {
                debounceTimer = setTimeout(async () => {
                    const suggestions = await getAddressSuggestions(value);
                    
                    suggestionsElement.innerHTML = '';
                    
                    if (suggestions.length > 0) {
                        suggestions.forEach(suggestion => {
                            const li = document.createElement('li');
                            li.textContent = suggestion;
                            li.addEventListener('click', () => {
                                inputElement.value = suggestion;
                                suggestionsElement.classList.add('hidden');
                            });
                            suggestionsElement.appendChild(li);
                        });
                        
                        suggestionsElement.classList.remove('hidden');
                    } else {
                        suggestionsElement.classList.add('hidden');
                    }
                }, 500); // Задержка 500 мс перед запросом
            } else {
                suggestionsElement.classList.add('hidden');
            }
        });
    }
}


    // Настройка подсказок для обоих полей адреса
    setupAddressSuggestions(clientAddressInput,
        addressSuggestions);
    setupAddressSuggestions(startLocationInput,
        startLocationSuggestions);*/

    // Обработчик для кнопки установки начальной точки
    if (setStartLocationBtn) {
    setStartLocationBtn.addEventListener('click', async () => {
        const address = startLocationInput.value.trim();
        
        if (address) {
            try {
                const coordinates = await geocodeAddress(address);
                if (coordinates) {
                    startLocation = coordinates;
                    startLocationInfo = {
                        address: address,
                        coordinates: coordinates,
                        timestamp: new Date().toISOString()
                    };
                    
                    localStorage.setItem('startLocation', JSON.stringify(startLocationInfo));
                    
                    await showAlert(`Начальная точка установлена: ${address} [${coordinates}]`);
                    
                    if (startLocationInput.parentNode) {
                        const infoElement = document.createElement('div');
                        infoElement.className = 'start-location-info';
                        infoElement.textContent = `Текущая точка старта: ${address}`;
                        startLocationInput.parentNode.appendChild(infoElement);
                    }
                } else {
                    await showAlert('Не удалось найти координаты для указанного адреса');
                }
            } catch (error) {
                await showAlert(`Ошибка при установке начальной точки: ${error.message}`);
            }
        } else {
            await showAlert('Введите адрес начальной точки');
        }
    });
}

    // Обработчик отправки формы заказа
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', async () => {
            const address = clientAddressInput.value.trim();
            const weight = parseFloat(orderWeightInput.value);
            const isHighPriceDelivery = highPriceDeliveryCheckbox && highPriceDeliveryCheckbox.checked;

            if (address && weight > 0) {
                try {
                    if (!startLocation) {
                        console.log('Начальная точка не установлена, используем случайные координаты');
                        startLocation = [Math.random() * 10,
                            Math.random() * 10];
                    }

                    // Геокодируем адрес клиента
                    console.log(`Геокодирование адреса клиента: ${address}`);
                    const endCoordinates = await geocodeAddress(address);

                    if (!endCoordinates) {
                        await showAlert('Не удалось найти координаты для адреса клиента');
                        return;
                    }

                    // Рассчитываем расстояние
                    console.log('Расчет расстояния...');
                    const distance = await calculateDistance(startLocation, endCoordinates);

                    if (distance === null) {
                        await showAlert('Не удалось рассчитать расстояние');
                        return;
                    }

                    // Рассчитываем цену
                    const price = calculatePrice(weight, distance, isHighPriceDelivery);
                    console.log(`Рассчитанная цена: ${price}р`);

                    const order = {
                        id: nextOrderId++,
                        address,
                        weight,
                        price,
                        isHighPriceDelivery,
                        completed: false,
                        distance: typeof distance === 'number' ? distance.toFixed(2): '?'
                    };

                    console.log('Создан новый заказ:', order);
                    orders.push(order);
                    renderOrderList();

                    // Сброс формы
                    clientAddressInput.value = '';
                    orderWeightInput.value = '';
                    if (highPriceDeliveryCheckbox) highPriceDeliveryCheckbox.checked = false;

                    showScreen('orderList');
                } catch (error) {
                    console.error('Ошибка при создании заказа:', error);
                    await showAlert(`Ошибка при создании заказа: ${error.message}`);
                }
            } else {
                await showAlert('Введите адрес и вес заказа');
            }
        });
    }

    // Отображение списка заказов
    function renderOrderList() {
        if (orderList) orderList.innerHTML = '';
        if (executionOrderList) executionOrderList.innerHTML = '';

        const listToRender = routeStartTime ? executionOrderList: orderList;

        if (listToRender) {
            orders.forEach(order => {
                const orderElement = createOrderElement(order);
                listToRender.appendChild(orderElement);
            });

            setupDragAndDrop();
        }
    }

    // Создание элемента заказа
    function createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item';
        orderElement.setAttribute('data-id', order.id);

        const header = document.createElement('div');
        header.className = 'order-header';
        header.innerHTML = '<span>Номер</span><span>Адрес</span><span>Вес</span>';

        const data = document.createElement('div');
        data.className = 'order-data';
        data.innerHTML = `<span>${order.id}</span><span>${order.address}</span><span>${order.weight}</span>`;

        const price = document.createElement('div');
        price.className = 'order-price';
        price.innerHTML = `<span>Цена</span><span>${order.price}р</span>`;

        const distance = document.createElement('div');
        distance.className = 'order-distance';
        distance.innerHTML = `<span>Расстояние</span><span>${order.distance} км</span>`;

        orderElement.appendChild(header);
        orderElement.appendChild(data);
        orderElement.appendChild(price);
        orderElement.appendChild(distance);

        // Добавляем кнопки редактирования и удаления только если маршрут не начат
        if (!routeStartTime) {
            const actions = document.createElement('div');
            actions.className = 'order-actions';

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Редактировать';
            editBtn.addEventListener('click', () => {
                // Реализация редактирования заказа
                clientAddressInput.value = order.address;
                orderWeightInput.value = order.weight;
                if (highPriceDeliveryCheckbox) highPriceDeliveryCheckbox.checked = order.isHighPriceDelivery;

                // Удаляем текущий заказ, после редактирования будет создан новый
                orders = orders.filter(o => o.id !== order.id);

                showScreen('orderForm');
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Удалить';
            deleteBtn.addEventListener('click',
                () => {
                    orders = orders.filter(o => o.id !== order.id);
                    renderOrderList();
                });

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            orderElement.appendChild(actions);
        }

        return orderElement;
    }

    // Обработчик начала маршрута
    if (startRouteBtn) {
        startRouteBtn.addEventListener('click', async () => {
            if (orders.length > 0) {
                routeStartTime = new Date();
                // Добавим запись в localStorage о начале маршрута
                localStorage.setItem('currentRouteStartTime', routeStartTime.toISOString());
                console.log(`Маршрут начат в ${routeStartTime.toLocaleTimeString()}`);
                showScreen('routeExecution');
                renderOrderList();
            } else {
                await showAlert('Добавьте хотя бы один заказ для начала маршрута');
            }
        });
    }




    // Обработчик завершения маршрута
    if (finishRouteBtn) {
        finishRouteBtn.addEventListener('click', () => {
            if (routeStartTime) {
                const endTime = new Date();
                const diff = endTime - routeStartTime;

                // Расчет времени выполнения
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                const formattedTime = `${hours}ч ${minutes}м ${seconds}с`;

                // Расчет дохода
                const income = orders.reduce((sum, order) => sum + order.price, 0);

                // Сохраняем данные о маршруте в историю с точным временем
                const completedRoute = {
                    id: routeHistory.length + 1,
                    date: new Date(),
                    startTime: routeStartTime,
                    startTimeFormatted: routeStartTime.toLocaleTimeString(),
                    endTime: endTime,
                    endTimeFormatted: endTime.toLocaleTimeString(),
                    executionTime: formattedTime,
                    executionTimeMs: diff,
                    income: income,
                    orders: [...orders] // Копируем все заказы
                };

                routeHistory.push(completedRoute);

                // Сохраняем историю в localStorage
                localStorage.setItem('routeHistory', JSON.stringify(routeHistory));
                // Удаляем запись о текущем маршруте
                localStorage.removeItem('currentRouteStartTime');

                console.log(`Маршрут завершен. Начало: ${completedRoute.startTimeFormatted}, Конец: ${completedRoute.endTimeFormatted}`);
                console.log(`Время выполнения: ${formattedTime}, доход: ${income}р`);

                if (executionTimeElement) executionTimeElement.textContent = formattedTime;
                if (totalIncomeElement) totalIncomeElement.textContent = `${income}р`;

                showScreen('routeCompletion');
            }
        });
    }


    // Обработчик кнопки ОК на экране завершения
    if (okBtn) {
        okBtn.addEventListener('click', () => {
            // Сброс данных приложения
            orders = [];
            routeStartTime = null;

            showScreen('initial');
        });
    }

    // Обработчик для кнопки показа истории
    if (showHistoryBtn) {
        showHistoryBtn.addEventListener('click', () => {
            renderRouteHistory();
            showScreen('routeHistory');
        });
    }

    // Обработчик для кнопки возврата на главный экран
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => {
            showScreen('initial');
        });
    }

    // Функции для drag-and-drop
    let draggedItem = null;

    function handleDragStart(e) {
        draggedItem = this;
        setTimeout(() => {
            this.style.opacity = '0.5';
        }, 0);
    }

    function handleDragEnd(e) {
        this.style.opacity = '1';
        draggedItem = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    function handleDragEnter(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    }

    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleDrop() {
        this.classList.remove('drag-over');

        if (draggedItem !== this) {
            const container = this.parentNode;
            const items = Array.from(container.querySelectorAll('.order-item'));
            const draggedIndex = items.indexOf(draggedItem);
            const targetIndex = items.indexOf(this);

            if (draggedIndex < targetIndex) {
                container.insertBefore(draggedItem, this.nextSibling);
            } else {
                container.insertBefore(draggedItem, this);
            }

            // Обновление порядка заказов в массиве
            const newOrders = [];
            items.forEach(item => {
                const id = parseInt(item.getAttribute('data-id'));
                const order = orders.find(o => o.id === id);
                if (order) newOrders.push(order);
            });

            orders = newOrders;
        }
    }

    // Добавление обработчиков событий для drag-and-drop
    function setupDragAndDrop() {
        const orderItems = document.querySelectorAll('.order-item');
        orderItems.forEach(item => {
            item.setAttribute('draggable', true);
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);
            item.addEventListener('drop', handleDrop);
        });
    }

    // Загружаем историю маршрутов
    loadRouteHistory();

    // Инициализация приложения
    showScreen('initial');
});