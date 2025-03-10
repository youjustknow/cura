var orderId = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Глобальные переменные для элементов интерфейса смены
    let shiftStartTimeInput = document.getElementById('shiftStartTimeInput');
    let shiftEndTimeInput = document.getElementById('shiftEndTimeInput');
    let shiftTimeModal = document.getElementById('shiftTimeModal');
    let confirmShiftTimeBtn = document.getElementById('confirmShiftTimeBtn');
    let cancelShiftTimeBtn = document.getElementById('cancelShiftTimeBtn');

    // Данные приложения
    let orders = [];
    let routeStartTime = null;
    let nextOrderId = 1;
    let startLocation = null;
    const API_KEY = '5b3ce3597851110001cf624892de0fe27ec54ee0afc5e65a6fff3c5c'; // Замените на свой ключ API


    // Добавляем новые элементы интерфейса
    const shiftInfoModal = document.getElementById('shiftInfoModal');
    const shiftInfoCloseBtn = document.getElementById('shiftInfoCloseBtn');
    const shiftStartTime = document.getElementById('shiftStartTime');
    const shiftDuration = document.getElementById('shiftDuration');
    const currentShiftIncome = document.getElementById('currentShiftIncome');
    const currentHourlyIncome = document.getElementById('currentHourlyIncome');
    const predictedIncome = document.getElementById('predictedIncome');

    // Кнопки управления сменой
    const startShiftBtn = document.getElementById('startShiftBtn');
    const endShiftBtn = document.getElementById('endShiftBtn');
    const shiftInfoBtn = document.getElementById('shiftInfoBtn');
    const addOrderBtn = document.getElementById('addOrderBtn');

    // Элементы интерфейса
    const screens = {
        initial: document.getElementById('initialScreen'),
        orderForm: document.getElementById('orderFormScreen'),
        orderList: document.getElementById('orderListScreen'),
        routeExecution: document.getElementById('routeExecutionScreen'),
        routeCompletion: document.getElementById('routeCompletionScreen'),
        routeHistory: document.getElementById('routeHistoryScreen'),
        settings: document.getElementById('settingsScreen'),
        shiftsHistory: document.getElementById('shiftsHistoryScreen'),
        statsScreen: document.getElementById('statsScreen')
    };

    // Глобальные переменные для смен
    let currentShift = null;
    let shiftsHistory = [];

    // Загрузка истории смен
    const savedShifts = localStorage.getItem('shiftsHistory');
    if (savedShifts) {
        try {
            shiftsHistory = JSON.parse(savedShifts).map(shift => ({
                ...shift,
                startTime: new Date(shift.startTime),
                endTime: shift.endTime ? new Date(shift.endTime) : null
            }));
        } catch (error) {
            console.error('Ошибка при загрузке истории смен:', error);
            shiftsHistory = [];
        }
    }

    // Проверка текущей смены
    const savedCurrentShift = localStorage.getItem('currentShift');
    if (savedCurrentShift) {
        try {
            currentShift = JSON.parse(savedCurrentShift);
            currentShift.startTime = new Date(currentShift.startTime);
            currentShift.plannedEndTime = new Date(currentShift.plannedEndTime);
            if (currentShift.endTime) {
                currentShift.endTime = new Date(currentShift.endTime);
            }
            
            // Восстанавливаем значения в полях ввода времени
            if (shiftStartTimeInput && shiftEndTimeInput) {
                const startHours = currentShift.startTime.getHours().toString().padStart(2, '0');
                const startMinutes = currentShift.startTime.getMinutes().toString().padStart(2, '0');
                const endHours = currentShift.plannedEndTime.getHours().toString().padStart(2, '0');
                const endMinutes = currentShift.plannedEndTime.getMinutes().toString().padStart(2, '0');
                
                shiftStartTimeInput.value = `${startHours}:${startMinutes}`;
                shiftEndTimeInput.value = `${endHours}:${endMinutes}`;
            }

            // Восстанавливаем текущие заказы, если есть незавершенный маршрут
            const savedOrders = localStorage.getItem('currentRoute');
            if (savedOrders && !currentShift.endTime) {
                try {
                    orders = JSON.parse(savedOrders);
                    routeStartTime = new Date(localStorage.getItem('currentRouteStartTime'));
                    if (routeStartTime) {
                        showScreen('routeExecution');
                        renderOrderList();
                    }
                } catch (error) {
                    console.error('Ошибка при восстановлении заказов:', error);
                    orders = [];
                    routeStartTime = null;
                }
            }
            
            updateShiftControls();
            
            // Показываем информацию о текущей смене
            if (!currentShift.endTime) {
                shiftInfoBtn.classList.remove('hidden');
                endShiftBtn.classList.remove('hidden');
                startShiftBtn.classList.add('hidden');
                addOrderBtn.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Ошибка при загрузке текущей смены:', error);
            currentShift = null;
        }
    }

    // Глобальная переменная для истории маршрутов
    let routeHistory = [];
    let startLocationData = null;

    // Настройки по умолчанию
    const defaultSettings = {
        defaultStartLocation: null,
        distanceRate: 18,
        weightRate: 2,
        pickupRate: 63,
        deliveryRate: 86,
        highPriceDeliveryRate: 110
    };

    // Текущие настройки
    let settings = { ...defaultSettings };

    // Поля формы
    const clientAddressInput = document.getElementById('clientAddress');
    const orderWeightInput = document.getElementById('orderWeight');
    const highPriceDeliveryCheckbox = document.getElementById('highPriceDelivery');
    const addressSuggestions = document.getElementById('addressSuggestions');
    const startLocationInput = document.getElementById('startLocation');
    const startLocationSuggestions = document.getElementById('startLocationSuggestions');
    const setStartLocationBtn = document.getElementById('setStartLocationBtn');
    const startLocationInfo = document.getElementById('startLocationInfo');

    // Загружаем настройки сразу при старте
    loadSettings();
    console.log('Настройки загружены при старте:', settings);

    // Элементы бокового меню
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const menuButtons = document.querySelectorAll('.menu-btn');
    const showMainBtn = document.getElementById('showMainBtn');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    // Кнопки
    const addOrderBtns = {
        initial: addOrderBtn,
        form: document.getElementById('formAddOrderBtn'),
        list: document.getElementById('listAddOrderBtn')
    };

    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const startRouteBtn = document.getElementById('startRouteBtn');
    const finishRouteBtn = document.getElementById('finishRouteBtn');
    const okBtn = document.getElementById('okBtn');
    const showHistoryBtn = document.getElementById('showHistoryBtn');
    const backToMainBtn = document.getElementById('backToMainBtn');
    const showSettingsBtn = document.getElementById('showSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const showShiftsHistoryBtn = document.getElementById('showShiftsHistoryBtn');

    // Контейнеры для списков заказов
    const orderList = document.getElementById('orderList');
    const executionOrderList = document.getElementById('executionOrderList');
    const routeHistoryList = document.getElementById('routeHistoryList');
    const shiftsHistoryList = document.getElementById('shiftsHistoryList');

    // Элементы экрана завершения
    const executionTimeElement = document.getElementById('executionTime');
    const totalIncomeElement = document.getElementById('totalIncome');

    // Добавляем новые элементы интерфейса для выбора времени
    // Переменные уже объявлены в начале файла

    // Функция для переключения активного состояния кнопок меню
    function setActiveMenuButton(activeButton) {
        menuButtons.forEach(button => {
            button.classList.remove('active');
        });
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // Функция для открытия/закрытия меню
    function toggleMenu() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    }

    // Обработчик для переключения меню
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Обработчик клика по оверлею
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            toggleMenu();
        });
    }

    // Обработчик клика по меню (предотвращаем закрытие при клике внутри)
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Обновляем обработчики кнопок меню
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            toggleMenu(); // Закрываем меню при клике на пункт
        });
    });

    // Обновляем обработчик для кнопки "Главная"
    if (showMainBtn) {
        showMainBtn.addEventListener('click', () => {
            setActiveMenuButton(showMainBtn);
            showScreen('initial');
            sidebar.classList.remove('open');
        });
    }

    // Обновляем обработчик для кнопки "История"
    if (showHistoryBtn) {
        showHistoryBtn.addEventListener('click', () => {
            setActiveMenuButton(showHistoryBtn);
            renderRouteHistory();
            showScreen('routeHistory');
            sidebar.classList.remove('open');
        });
    }

    // Обновляем обработчик для кнопки "Настройки"
    if (showSettingsBtn) {
        showSettingsBtn.addEventListener('click', () => {
            setActiveMenuButton(showSettingsBtn);
            updateSettingsForm();
            showScreen('settings');
            sidebar.classList.remove('open');
        });
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
                            <span>${order.id}</span>
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

    // Функция загрузки настроек
    function loadSettings() {
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                settings = { ...defaultSettings, ...parsed };
                console.log('Загружены настройки:', settings);
            } catch (error) {
                console.error('Ошибка при загрузке настроек:', error);
                settings = { ...defaultSettings };
            }
        }
        updateSettingsForm();
        applyDefaultStartLocation();
    }

    // Функция сохранения настроек
    function saveSettings() {
        settings = {
            defaultStartLocation: document.getElementById('defaultStartLocation').value,
            distanceRate: parseFloat(document.getElementById('distanceRate').value) || defaultSettings.distanceRate,
            weightRate: parseFloat(document.getElementById('weightRate').value) || defaultSettings.weightRate,
            pickupRate: parseFloat(document.getElementById('pickupRate').value) || defaultSettings.pickupRate,
            deliveryRate: parseFloat(document.getElementById('deliveryRate').value) || defaultSettings.deliveryRate,
            highPriceDeliveryRate: parseFloat(document.getElementById('highPriceDeliveryRate').value) || defaultSettings.highPriceDeliveryRate
        };

        localStorage.setItem('settings', JSON.stringify(settings));
        console.log('Настройки сохранены:', settings);
    }

    // Функция обновления формы настроек
    function updateSettingsForm() {
        document.getElementById('defaultStartLocation').value = settings.defaultStartLocation || '';
        document.getElementById('distanceRate').value = settings.distanceRate;
        document.getElementById('weightRate').value = settings.weightRate;
        document.getElementById('pickupRate').value = settings.pickupRate;
        document.getElementById('deliveryRate').value = settings.deliveryRate;
        document.getElementById('highPriceDeliveryRate').value = settings.highPriceDeliveryRate;
    }

    // Функция применения начальной точки из настроек
    async function applyDefaultStartLocation() {
        if (settings.defaultStartLocation) {
            startLocationInput.value = settings.defaultStartLocation;
            try {
                const coordinates = await geocodeAddress(settings.defaultStartLocation);
                if (coordinates) {
                    startLocation = coordinates;
                    startLocationData = {
                        address: settings.defaultStartLocation,
                        coordinates: coordinates,
                        timestamp: new Date().toISOString()
                    };
                    localStorage.setItem('startLocation', JSON.stringify(startLocationData));
                    updateStartLocationInfo();
                    console.log('Начальная точка установлена из настроек:', startLocationData);
                }
            } catch (error) {
                console.error('Ошибка при установке начальной точки из настроек:', error);
            }
        }
    }

    // Обработчик для кнопки установки начальной точки по умолчанию
    const setDefaultLocationBtn = document.getElementById('setDefaultLocationBtn');
    if (setDefaultLocationBtn) {
        setDefaultLocationBtn.addEventListener('click', async () => {
            const address = document.getElementById('defaultStartLocation').value.trim();
            if (address) {
                try {
                    const coordinates = await geocodeAddress(address);
                    if (coordinates) {
                        settings.defaultStartLocation = address;
                        saveSettings();
                        await showAlert('Начальная точка по умолчанию установлена');
                        // Применяем новую начальную точку
                        startLocationInput.value = address;
                        await applyDefaultStartLocation();
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

    // Обновляем функцию расчета цены
    function calculatePrice(weight, distance, isHighPriceDelivery = false) {
        const pickupPrice = settings.pickupRate;
        const deliveryPrice = isHighPriceDelivery ? settings.highPriceDeliveryRate : settings.deliveryRate;
        const weightPrice = weight * settings.weightRate;
        const distancePrice = distance * settings.distanceRate;

        return Math.round(pickupPrice + deliveryPrice + weightPrice + distancePrice);
    }

    // Функция для геокодирования адреса с подробной обработкой ошибок
    async function geocodeAddress(address) {
        address = `Нижний Новгород, ${address}`;

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

    // Функция обновления информации о начальной точке
    function updateStartLocationInfo() {
        if (startLocationInfo) {
            if (startLocationData && startLocation) {
                startLocationInfo.textContent = `Текущая точка старта: ${startLocationData.address || 'Не установлена'}`;
                startLocationInfo.classList.remove('hidden');
            } else {
                startLocationInfo.classList.add('hidden');
            }
        }
    }

    // Загрузка стартовой точки при инициализации
    function loadStartLocation() {
        const savedStartLocation = localStorage.getItem('startLocation');
        if (savedStartLocation) {
            try {
                startLocationData = JSON.parse(savedStartLocation);
                startLocation = startLocationData.coordinates;
                console.log(`Загружена стартовая точка: ${startLocationData.address} [${startLocation}]`);
                updateStartLocationInfo();
            } catch (error) {
                console.error('Ошибка при загрузке стартовой точки:', error);
                startLocationData = null;
                startLocation = null;
            }
        }
    }

    // Обработчик для кнопки установки начальной точки
    if (setStartLocationBtn) {
        setStartLocationBtn.addEventListener('click', async () => {
            const address = startLocationInput.value.trim();
            
            if (address) {
                try {
                    const coordinates = await geocodeAddress(address);
                    if (coordinates) {
                        startLocation = coordinates;
                        startLocationData = {
                            address: address,
                            coordinates: coordinates,
                            timestamp: new Date().toISOString()
                        };
                        
                        localStorage.setItem('startLocation', JSON.stringify(startLocationData));
                        updateStartLocationInfo();
                        await showAlert(`Начальная точка установлена: ${address}`);
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

    // Функция для заполнения начальной точки
    function fillStartLocation() {
        if (startLocationData && startLocationData.address) {
            startLocationInput.value = startLocationData.address;
            startLocation = startLocationData.coordinates;
            console.log('Начальная точка автоматически заполнена:', startLocationData.address);
        } else if (settings.defaultStartLocation) {
            startLocationInput.value = settings.defaultStartLocation;
            console.log('Начальная точка заполнена из настроек:', settings.defaultStartLocation);
        }
    }

    // Обработчики событий для кнопок добавления заказа
    Object.values(addOrderBtns).forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                showScreen('orderForm');
                fillStartLocation(); // Заполняем начальную точку
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

    // Обработчики для экрана настроек
    if (showSettingsBtn) {
        showSettingsBtn.addEventListener('click', () => {
            updateSettingsForm();
            showScreen('settings');
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            saveSettings();
            await showAlert('Настройки сохранены');
            showScreen('initial');
        });
    }

    // Функции для работы с модальными окнами
    function showAlert(message) {
        const modal = document.getElementById('alertModal');
        const messageElement = document.getElementById('alertMessage');
        const okButton = document.getElementById('alertOkBtn');

        messageElement.textContent = message;
        modal.classList.remove('hidden');
        sidebar.classList.remove('open'); // Закрываем боковое меню при показе модального окна

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
        sidebar.classList.remove('open'); // Закрываем боковое меню при показе модального окна

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

    // Проверка незавершенного маршрута при загрузке
    function checkForUnfinishedRoute() {
        const savedStartTime = localStorage.getItem('currentRouteStartTime');
        const savedOrders = localStorage.getItem('currentRoute');
        
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
                            
                            // Восстанавливаем заказы из localStorage
                            if (savedOrders) {
                                try {
                                    orders = JSON.parse(savedOrders);
                                    console.log('Заказы восстановлены из localStorage:', orders);
                                } catch (error) {
                                    console.error('Ошибка при восстановлении заказов:', error);
                                }
                            }
                            
                            showScreen('routeExecution');
                            renderOrderList(); // Отображаем восстановленные заказы
                            return true;
                        } else {
                            localStorage.removeItem('currentRouteStartTime');
                            localStorage.removeItem('currentRoute');
                            return false;
                        }
                    });
            } else {
                localStorage.removeItem('currentRouteStartTime');
                localStorage.removeItem('currentRoute');
            }
        }
        return Promise.resolve(false);
    }

    // Инициализация приложения
    //document.addEventListener('DOMContentLoaded', function() {
        loadRouteHistory();
        loadStartLocation();
        checkForUnfinishedRoute().then(restored => {
            if (!restored) {
                showScreen('initial');
            }
        });
    //});

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

                    const editedOrder = orders.find(o => o.id === orderId);

                    if (!editedOrder) {
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
                    } else {
                        editedOrder.address = address;
                        editedOrder.weight = weight;
                        editedOrder.isHighPriceDelivery = isHighPriceDelivery;

                        orderId = 0;
                    }

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

                orderId = order.id;

                // Удаляем текущий заказ, после редактирования будет создан новый
                //orders = orders.filter(o => o.id !== order.id);

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
                // Сохраняем текущие заказы в localStorage
                localStorage.setItem('currentRoute', JSON.stringify(orders));
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

                // Создаем объект маршрута
                const completedRoute = {
                    id: routeHistory.length + 1,
                    date: new Date(),
                    startTime: routeStartTime,
                    endTime: endTime,
                    executionTime: formattedTime,
                    executionTimeMs: diff,
                    income: income,
                    orders: [...orders]
                };

                // Добавляем маршрут в текущую смену
                if (currentShift) {
                    currentShift.routes.push(completedRoute);
                    currentShift.totalIncome += income;
                    localStorage.setItem('currentShift', JSON.stringify(currentShift));
                }

                routeHistory.push(completedRoute);
                localStorage.setItem('routeHistory', JSON.stringify(routeHistory));
                localStorage.removeItem('currentRouteStartTime');
                localStorage.removeItem('currentRoute');

                if (executionTimeElement) executionTimeElement.textContent = formattedTime;
                if (totalIncomeElement) totalIncomeElement.textContent = `${income}₽`;

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

    // Функция начала смены
    function startShift() {
        const now = new Date();
        const [startHours, startMinutes] = shiftStartTimeInput.value.split(':');
        const [endHours, endMinutes] = shiftEndTimeInput.value.split(':');

        // Устанавливаем время начала и конца смены
        const startTime = new Date(now);
        startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0);

        const endTime = new Date(now);
        endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);

        // Если конец смены раньше начала, добавляем день к концу
        if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
        }

        currentShift = {
            id: shiftsHistory.length + 1,
            startTime: startTime,
            plannedEndTime: endTime,
            routes: [],
            totalIncome: 0
        };

        localStorage.setItem('currentShift', JSON.stringify(currentShift));
        updateShiftControls();
    }

    // Функция завершения смены
    async function endShift() {
        if (!currentShift) return;

        const confirmed = await showConfirm('Вы уверены, что хотите завершить смену?');
        if (!confirmed) return;

        currentShift.endTime = new Date();
        currentShift.totalIncome = currentShift.routes.reduce((sum, route) => sum + route.income, 0);
        
        // Расчет дохода в час
        const shiftDuration = (currentShift.endTime - currentShift.startTime) / (1000 * 60 * 60); // в часах
        currentShift.hourlyIncome = Math.round(currentShift.totalIncome / shiftDuration);

        shiftsHistory.push({...currentShift});
        localStorage.setItem('shiftsHistory', JSON.stringify(shiftsHistory));
        localStorage.removeItem('currentShift');
        
        currentShift = null;
        updateShiftControls();
        await showAlert('Смена завершена');
    }

    // Функция обновления элементов управления сменой
    function updateShiftControls() {
        if (currentShift) {
            if (!currentShift.endTime) {
                // Активная смена
                startShiftBtn.classList.add('hidden');
                endShiftBtn.classList.remove('hidden');
                addOrderBtn.classList.remove('hidden');
                shiftInfoBtn.classList.remove('hidden');

                // Обновляем информацию о смене
                updateShiftInfo();
            } else {
                // Завершенная смена
                startShiftBtn.classList.remove('hidden');
                endShiftBtn.classList.add('hidden');
                addOrderBtn.classList.add('hidden');
                shiftInfoBtn.classList.add('hidden');
            }
        } else {
            // Нет смены
            startShiftBtn.classList.remove('hidden');
            endShiftBtn.classList.add('hidden');
            addOrderBtn.classList.add('hidden');
            shiftInfoBtn.classList.add('hidden');
        }
    }

    // Функция отображения истории смен
    function renderShiftsHistory() {
        shiftsHistoryList.innerHTML = '';

        shiftsHistory.sort((a, b) => b.endTime - a.endTime).forEach(shift => {
            const shiftElement = document.createElement('div');
            shiftElement.className = 'shift-group';

            const header = document.createElement('div');
            header.className = 'shift-header';
            
            const shiftDuration = shift.endTime 
                ? ((shift.endTime - shift.startTime) / (1000 * 60 * 60)).toFixed(1)
                : 'Не завершена';

            header.innerHTML = `
                <div class="shift-info">
                    <div class="shift-time">
                        <span class="shift-label">Начало</span>
                        <span class="shift-value">${shift.startTime.toLocaleString()}</span>
                        <span class="shift-label">Конец</span>
                        <span class="shift-value">${shift.endTime ? shift.endTime.toLocaleString() : 'Не завершена'}</span>
                        <span class="shift-label">Длительность</span>
                        <span class="shift-value">${shiftDuration} ч</span>
                    </div>
                    <div class="shift-income">
                        <span class="shift-label">Доход за смену</span>
                        <span class="shift-value">${shift.totalIncome}₽</span>
                        <span class="shift-label">Доход в час</span>
                        <span class="shift-value">${shift.hourlyIncome}₽/час</span>
                    </div>
                </div>
            `;

            const routesContainer = document.createElement('div');
            routesContainer.className = 'shift-routes hidden';

            // Отображение маршрутов внутри смены
            shift.routes.forEach(route => {
                const routeElement = createRouteElement(route);
                routesContainer.appendChild(routeElement);
            });

            header.addEventListener('click', () => {
                routesContainer.classList.toggle('hidden');
            });

            shiftElement.appendChild(header);
            shiftElement.appendChild(routesContainer);
            shiftsHistoryList.appendChild(shiftElement);
        });
    }

    // Функция создания элемента маршрута для истории смен
    function createRouteElement(route) {
        const routeElement = document.createElement('div');
        routeElement.className = 'route-item';

        const routeHeader = document.createElement('div');
        routeHeader.className = 'route-header';
        routeHeader.innerHTML = `
            <span>Маршрут #${route.id}</span>
            <span>${route.executionTime}</span>
            <span>${route.income}₽</span>
        `;

        const routeDetails = document.createElement('div');
        routeDetails.className = 'route-details hidden';

        route.orders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'history-order-item';
            orderElement.innerHTML = `
                <div class="order-info">
                    <span>${order.id}</span>
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

        routeHeader.addEventListener('click', () => {
            routeDetails.classList.toggle('hidden');
        });

        routeElement.appendChild(routeHeader);
        routeElement.appendChild(routeDetails);
        return routeElement;
    }

    // Обновляем функцию показа экрана
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        if (screens[screenId]) {
            screens[screenId].classList.remove('hidden');
            // Обновляем активную кнопку меню
            if (screenId === 'initial') {
                setActiveMenuButton(showMainBtn);
            } else if (screenId === 'routeHistory') {
                setActiveMenuButton(showHistoryBtn);
            } else if (screenId === 'settings') {
                setActiveMenuButton(showSettingsBtn);
            } else if (screenId === 'shiftsHistory') {
                setActiveMenuButton(showShiftsHistoryBtn);
            } else {
                setActiveMenuButton(null);
            }
        }
    }

    // Обработчики для кнопок управления сменой
    if (startShiftBtn) {
        startShiftBtn.addEventListener('click', () => {
            shiftTimeModal.classList.remove('hidden');
        });
    }

    if (endShiftBtn) {
        endShiftBtn.addEventListener('click', () => {
            endShift();
        });
        
    }

    // Обработчик для кнопки истории смен
    if (showShiftsHistoryBtn) {
        showShiftsHistoryBtn.addEventListener('click', () => {
            setActiveMenuButton(showShiftsHistoryBtn);
            renderShiftsHistory();
            showScreen('shiftsHistory');
            sidebar.classList.remove('open');
        });
    }

    // Обработчик для кнопки статистики
    const showStatsBtn = document.getElementById('showStatsBtn');
    if (showStatsBtn) {
        showStatsBtn.addEventListener('click', () => {
            setActiveMenuButton(showStatsBtn);
            updateStatistics();
            showScreen('statsScreen');
            sidebar.classList.remove('open');
        });
    }

    // Функция для форматирования длительности
    function formatDuration(milliseconds) {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}ч ${minutes}м`;
    }

    // Обновляем функцию расчета информации о смене
    function calculateShiftInfo() {
        if (!currentShift) return null;

        const now = new Date();
        const duration = now - currentShift.startTime;
        const durationHours = duration / (1000 * 60 * 60);
        
        // Расчет текущего дохода
        const currentIncome = currentShift.routes.reduce((sum, route) => sum + route.income, 0);
        
        // Расчет дохода в час
        const hourlyIncome = durationHours > 0 ? Math.round(currentIncome / durationHours) : 0;
        
        // Расчет прогноза с учетом запланированного времени
        let predictedShiftIncome = 0;
        if (durationHours > 0) {
            const totalPlannedHours = (currentShift.plannedEndTime - currentShift.startTime) / (1000 * 60 * 60);
            // Если смена длится менее 2 часов, применяем коэффициент оптимизма
            const optimismMultiplier = durationHours < 2 ? 1 : 1;
            predictedShiftIncome = Math.round(hourlyIncome * optimismMultiplier * totalPlannedHours);
        }

        return {
            startTime: currentShift.startTime,
            duration: formatDuration(duration),
            currentIncome,
            hourlyIncome,
            predictedShiftIncome
        };
    }

    // Функция обновления информации о смене
    function updateShiftInfo() {
        const info = calculateShiftInfo();
        if (info) {
            shiftStartTime.textContent = info.startTime.toLocaleTimeString();
            shiftDuration.textContent = info.duration;
            currentShiftIncome.textContent = `${info.currentIncome}₽`;
            currentHourlyIncome.textContent = `${info.hourlyIncome}₽/час`;
            predictedIncome.textContent = `${info.predictedShiftIncome}₽`;
        }
    }

    // Обработчик для кнопки информации о смене
    if (shiftInfoBtn) {
        shiftInfoBtn.addEventListener('click', () => {
            updateShiftInfo();
            shiftInfoModal.classList.remove('hidden');
        });
    }

    // Обработчик для закрытия модального окна
    if (shiftInfoCloseBtn) {
        shiftInfoCloseBtn.addEventListener('click', () => {
            shiftInfoModal.classList.add('hidden');
        });
    }

    // Обработчики для кнопок управления сменой
    if (confirmShiftTimeBtn) {
        confirmShiftTimeBtn.addEventListener('click', () => {
            startShift();
            shiftTimeModal.classList.add('hidden');
            showAlert('Смена начата');
        });
    }

    if (cancelShiftTimeBtn) {
        cancelShiftTimeBtn.addEventListener('click', () => {
            shiftTimeModal.classList.add('hidden');
        });
    }

    // Функция обновления статистики
    function updateStatistics() {
        // Получаем все завершенные смены
        const completedShifts = shiftsHistory.filter(shift => shift.endTime);

        // Общая статистика
        const totalShifts = completedShifts.length;
        const totalEarnings = completedShifts.reduce((sum, shift) => sum + shift.totalIncome, 0);
        const averageShiftEarnings = totalShifts > 0 ? Math.round(totalEarnings / totalShifts) : 0;

        // Расчет среднего дохода в час
        let totalHours = 0;
        completedShifts.forEach(shift => {
            totalHours += (shift.endTime - shift.startTime) / (1000 * 60 * 60);
        });
        const averageHourlyEarnings = totalHours > 0 ? Math.round(totalEarnings / totalHours) : 0;

        // Статистика по заказам
        let totalOrders = 0;
        let totalOrderPrice = 0;
        let totalDistance = 0;
        let totalWeight = 0;

        completedShifts.forEach(shift => {
            shift.routes.forEach(route => {
                totalOrders += route.orders.length;
                route.orders.forEach(order => {
                    totalOrderPrice += order.price;
                    totalDistance += parseFloat(order.distance);
                    totalWeight += order.weight;
                });
            });
        });

        const averageOrderPrice = totalOrders > 0 ? Math.round(totalOrderPrice / totalOrders) : 0;
        const averageDistance = totalOrders > 0 ? Math.round(totalDistance / totalOrders * 10) / 10 : 0;
        const averageWeight = totalOrders > 0 ? Math.round(totalWeight / totalOrders * 10) / 10 : 0;

        // Временная статистика
        const averageShiftDuration = totalShifts > 0 ? Math.round(totalHours / totalShifts * 10) / 10 : 0;
        const averageOrderTime = totalOrders > 0 ? Math.round(totalHours * 60 / totalOrders) : 0;

        // Поиск лучшего дня и смены
        let bestDayEarnings = 0;
        let bestDayDate = null;
        let bestShiftEarnings = 0;
        let bestShiftDate = null;

        // Группируем смены по дням
        const dailyEarnings = {};
        completedShifts.forEach(shift => {
            const dateKey = shift.startTime.toLocaleDateString();
            dailyEarnings[dateKey] = (dailyEarnings[dateKey] || 0) + shift.totalIncome;

            // Проверяем на лучшую смену
            if (shift.totalIncome > bestShiftEarnings) {
                bestShiftEarnings = shift.totalIncome;
                bestShiftDate = shift.startTime;
            }
        });

        // Находим лучший день
        Object.entries(dailyEarnings).forEach(([date, earnings]) => {
            if (earnings > bestDayEarnings) {
                bestDayEarnings = earnings;
                bestDayDate = date;
            }
        });

        // Обновляем значения на странице
        document.getElementById('totalShifts').textContent = totalShifts;
        document.getElementById('totalEarnings').textContent = `${totalEarnings}₽`;
        document.getElementById('averageShiftEarnings').textContent = `${averageShiftEarnings}₽`;
        document.getElementById('averageHourlyEarnings').textContent = `${averageHourlyEarnings}₽/час`;

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('averageOrderPrice').textContent = `${averageOrderPrice}₽`;
        document.getElementById('averageDistance').textContent = `${averageDistance} км`;
        document.getElementById('averageWeight').textContent = `${averageWeight} кг`;

        document.getElementById('averageShiftDuration').textContent = `${averageShiftDuration}ч`;
        document.getElementById('averageOrderTime').textContent = `${averageOrderTime}мин`;
        document.getElementById('bestDay').textContent = bestDayDate ? `${bestDayDate} (${bestDayEarnings}₽)` : '-';
        document.getElementById('bestShift').textContent = bestShiftDate ? 
            `${bestShiftDate.toLocaleDateString()} (${bestShiftEarnings}₽)` : '-';

        // Отрисовка графика
        renderEarningsChart(dailyEarnings);
    }

    // Функция отрисовки графика доходов
    function renderEarningsChart(dailyEarnings) {
        const chartContainer = document.getElementById('earningsChart');
        chartContainer.innerHTML = '';

        // Получаем последние 7 дней
        const dates = Object.keys(dailyEarnings).sort().slice(-7);
        const maxEarnings = Math.max(...Object.values(dailyEarnings));

        // Создаем график
        const chart = document.createElement('div');
        chart.style.display = 'flex';
        chart.style.alignItems = 'flex-end';
        chart.style.height = '100%';
        chart.style.gap = '10px';
        chart.style.padding = '10px';

        dates.forEach(date => {
            const earnings = dailyEarnings[date] || 0;
            const height = (earnings / maxEarnings * 100) || 0;

            const bar = document.createElement('div');
            bar.style.flex = '1';
            bar.style.display = 'flex';
            bar.style.flexDirection = 'column';
            bar.style.alignItems = 'center';
            bar.style.gap = '5px';

            const barValue = document.createElement('div');
            barValue.textContent = `${earnings}₽`;
            barValue.style.color = '#ccc';
            barValue.style.fontSize = '12px';

            const barColumn = document.createElement('div');
            barColumn.style.width = '100%';
            barColumn.style.height = `${height}%`;
            barColumn.style.backgroundColor = '#ffd700';
            barColumn.style.borderRadius = '4px';
            barColumn.style.transition = 'height 0.3s ease';

            const barDate = document.createElement('div');
            barDate.textContent = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            barDate.style.color = '#ccc';
            barDate.style.fontSize = '12px';

            bar.appendChild(barValue);
            bar.appendChild(barColumn);
            bar.appendChild(barDate);
            chart.appendChild(bar);
        });

        chartContainer.appendChild(chart);
    }

    // Инициализация
    updateShiftControls();
});