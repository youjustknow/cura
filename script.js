const settingsMain = JSON.parse(localStorage.getItem('settings'));

// Функция для геокодирования адреса с подробной обработкой ошибок
const YANDEX_API_KEY = settingsMain?.apiKey ?? '';

let orderId = 0;

// Добавляем стили для индикатора загрузки

// Добавляем стили для индикатора загрузки
const style = document.createElement('style');
style.textContent = `
    .loading-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    
    .loading-container.active {
        opacity: 1;
        visibility: visible;
    }
    
    .loading-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }
    
    .loading-dot {
        width: 6px;
        height: 6px;
        background-color: white;
        border-radius: 50%;
        animation: loading-dot-animation 1s infinite ease-in-out;
    }
    
    @keyframes loading-dot-animation {
        0%, 100% {
            transform: translateY(0);
            opacity: 0.3;
        }
        50% {
            transform: translateY(-15px);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Глобальные переменные для элементов интерфейса смены
let shiftStartTimeInput = document.getElementById('shiftStartTimeInput');
let shiftEndTimeInput = document.getElementById('shiftEndTimeInput');
let shiftTimeModal = document.getElementById('shiftTimeModal');
let confirmShiftTimeBtn = document.getElementById('confirmShiftTimeBtn');
let cancelShiftTimeBtn = document.getElementById('cancelShiftTimeBtn');

// Добавляем функцию для отображения индикатора загрузки
function showLoadingIndicator(container) {
    // Проверяем, существует ли контейнер
    if (!container) {
        // Если контейнер не передан, создаем новый
        container = document.createElement('div');
        container.className = 'loading-container';
        document.body.appendChild(container);
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаем индикатор загрузки
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    
    // Добавляем 5 точек для анимации
    for (let i = 0; i < 5; i++) {
        const dot = document.createElement('div');
        dot.className = 'loading-dot';
        // Добавляем задержку для создания эффекта "волны"
        dot.style.animationDelay = `${i * 0.15}s`;
        loadingIndicator.appendChild(dot);
    }
    
    container.appendChild(loadingIndicator);
    container.classList.add('active');
    
    return container;
}

// Функция для скрытия индикатора загрузки
function hideLoadingIndicator(container) {
    if (container) {
        container.classList.remove('active');
    }
}

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
    apiKey: '',
    defaultStartLocation: null,
    distanceRate: 18,
    weightRate: 2,
    pickupRate: 63,
    deliveryRate: 86,
    highPriceDeliveryRate: 110,
    themeColor: '#ff8c00'
};

// Текущие настройки
let settings = { ...defaultSettings };

// Поля формы
const clientAddressInput = document.getElementById('clientAddress');
const orderWeightInput = document.getElementById('orderWeight');
const highPriceDeliveryCheckbox = document.getElementById('highPriceDelivery');
//const addressSuggestions = document.getElementById('addressSuggestions');
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
        
        const loader = showLoadingIndicator();
        setTimeout(() => {
            renderRouteHistory();
            showScreen('routeHistory');
            sidebar.classList.remove('open');
            hideLoadingIndicator(loader);
        }, 100);
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
                totalIncome: 0,
                isoDate: route.date.toISOString(),
            };
        }
        groupedRoutes[dateKey].routes.push(route);
        groupedRoutes[dateKey].totalIncome += route.income;
    });

    // Отображаем маршруты, сгруппированные по датам
    Object.keys(groupedRoutes).sort((a, b) => {
        return new Date(groupedRoutes[b].isoDate) - new Date(groupedRoutes[a].isoDate); // Сортировка по убыванию дат
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
    
    // Применение цветовой палитры
    if (settings.themeColor) {
        const palette = generateColorPalette(settings.themeColor);
        applyColorPalette(palette);
    }
}

// Функция сохранения настроек
function saveSettings() {
    settings = {
        apiKey: document.getElementById('apiKey').value,
        defaultStartLocation: document.getElementById('defaultStartLocation').value,
        distanceRate: parseFloat(document.getElementById('distanceRate').value) || defaultSettings.distanceRate,
        weightRate: parseFloat(document.getElementById('weightRate').value) || defaultSettings.weightRate,
        pickupRate: parseFloat(document.getElementById('pickupRate').value) || defaultSettings.pickupRate,
        deliveryRate: parseFloat(document.getElementById('deliveryRate').value) || defaultSettings.deliveryRate,
        highPriceDeliveryRate: parseFloat(document.getElementById('highPriceDeliveryRate').value) || defaultSettings.highPriceDeliveryRate,
        themeColor: document.getElementById('themeColor').value || defaultSettings.themeColor
    };

    localStorage.setItem('settings', JSON.stringify(settings));
    console.log('Настройки сохранены:', settings);
    
    // Применение новой цветовой палитры
    const palette = generateColorPalette(settings.themeColor);
    applyColorPalette(palette);
}

// Функция обновления формы настроек
function updateSettingsForm() {
    document.getElementById('defaultStartLocation').value = settings.defaultStartLocation || '';
    document.getElementById('distanceRate').value = settings.distanceRate;
    document.getElementById('weightRate').value = settings.weightRate;
    document.getElementById('pickupRate').value = settings.pickupRate;
    document.getElementById('deliveryRate').value = settings.deliveryRate;
    document.getElementById('highPriceDeliveryRate').value = settings.highPriceDeliveryRate;
    document.getElementById('themeColor').value = settings.themeColor;
    document.getElementById('apiKey').value = settings.apiKey;
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
    const deliveryPrice = isHighPriceDelivery ? settings.highPriceDeliveryRate : settings.deliveryRate;
    const weightPrice = weight * settings.weightRate;
    const distancePrice = distance * settings.distanceRate;

    return Math.round(deliveryPrice + weightPrice + distancePrice);
}

// Обновляем функцию geocodeAddress чтобы использовать индикатор загрузки
async function geocodeAddress(address) {
    // Показываем индикатор загрузки
    const loader = showLoadingIndicator();
    
    try {
        if (!address.includes('Нижний')) {
            address = `Нижний Новгород, ${address}`;
        }

        const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?geocode=${address}&apikey=${YANDEX_API_KEY}&format=json`);
        const data = await response.json();
        
        // Скрываем индикатор загрузки
        hideLoadingIndicator(loader);
        
        return data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(' ').reverse().join(', ');
    } catch (error) {
        // Скрываем индикатор загрузки в случае ошибки
        hideLoadingIndicator(loader);
        console.error('Ошибка при геокодировании адреса:', error);
        throw error;
    }
}

// Обновляем функцию calculateDistance чтобы использовать индикатор загрузки
async function calculateDistance(startCoords, endCoords, mapId = 'map') {
    // Показываем индикатор загрузки
    const loader = showLoadingIndicator();
    
    return new Promise((resolve, reject) => {
        ymaps.ready(init);
        
        function init() {
            var myMap = new ymaps.Map(mapId, {
                center: startCoords, // Координаты Нижнего Новгорода
                zoom: 13,
                controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
            });
            
            // Создание мультимаршрута
            var multiRoute = new ymaps.multiRouter.MultiRoute({
                referencePoints: [
                    startCoords,
                    endCoords
                ],
                params: {
                    // Тип маршрутизации - пешеходная маршрутизация
                    routingMode: 'pedestrian'
                }
            }, {
                // Автоматически устанавливать границы карты так, чтобы маршрут был виден целиком
                boundsAutoApply: true,
                // Внешний вид линии маршрута
                routeActiveStrokeWidth: 6,
                routeActiveStrokeColor: "#1976D2"
            });
            
            // Добавляем мультимаршрут на карту
            myMap.geoObjects.add(multiRoute);
            
            // Подписываемся на событие обновления данных мультимаршрута
            multiRoute.model.events.add('requestsuccess', function() {
                // Получение активного маршрута
                var activeRoute = multiRoute.getActiveRoute();
                if (activeRoute) {
                    // Получение длины маршрута в метрах
                    var distance = activeRoute.properties.get("distance");

                    myMap.destroy();
                    
                    // Скрываем индикатор загрузки
                    hideLoadingIndicator(loader);

                    const distanceInKm = parseFloat(distance.text.replace(',', '.')) / (distance.text.includes('км') ? 1 : 1000);
                    
                    resolve(distanceInKm);
                }
            });
            
            // Обработка ошибок
            multiRoute.model.events.add('requestfail', function(error) {
                myMap.destroy();
                // Скрываем индикатор загрузки в случае ошибки
                hideLoadingIndicator(loader);
                reject(error);
            });
        }
    });
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
            // Проверяем наличие незавершенных заказов
            if (!loadUnfinishedOrders()) {
                showScreen('initial');
            }
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
                const loader = showLoadingIndicator();
                
                if (!startLocation) {
                    console.log('Начальная точка не установлена, используем случайные координаты');
                    startLocation = [Math.random() * 10,
                        Math.random() * 10];
                }

                // Геокодируем адрес клиента
                console.log(`Геокодирование адреса клиента: ${address}`);
                const endCoordinates = await geocodeAddress(address);

                if (!endCoordinates) {
                    hideLoadingIndicator(loader);
                    await showAlert('Не удалось найти координаты для адреса клиента');
                    return;
                }

                const lastOrder = orders.at(-1) ?? { coordinates: startLocation };

                // Рассчитываем расстояние
                console.log('Расчет расстояния...');
                const distance = await calculateDistance(lastOrder.coordinates, endCoordinates);

                if (distance === null) {
                    hideLoadingIndicator(loader);
                    await showAlert('Не удалось рассчитать расстояние');
                    return;
                }

                // Рассчитываем цену
                const price = calculatePrice(weight, distance, isHighPriceDelivery);
                console.log(`Рассчитанная цена: ${price}р`);

                const editedOrder = orders.find(o => o.id === orderId);

                if (!editedOrder) {
                    // Создаем объект с информацией о стартовой точке для заказа
                    let orderStartLocation = null;
                    if (startLocationData) {
                        orderStartLocation = {
                            address: startLocationData.address,
                            coordinates: startLocationData.coordinates,
                            timestamp: new Date().toISOString()
                        };
                    }

                    const order = {
                        id: nextOrderId++,
                        address,
                        weight,
                        price,
                        isHighPriceDelivery,
                        completed: false,
                        distance: typeof distance === 'number' ? distance.toFixed(2): '?',
                        coordinates: endCoordinates,
                        // Добавляем информацию о стартовой точке для заказа
                        startLocation: orderStartLocation
                    };

                    console.log('Создан новый заказ:', order);
                    orders.push(order);
                } else {
                    editedOrder.address = address;
                    editedOrder.weight = weight;
                    editedOrder.isHighPriceDelivery = isHighPriceDelivery;
                    editedOrder.price = price;
                    
                    // Обновляем информацию о стартовой точке при редактировании заказа
                    if (startLocationData) {
                        editedOrder.startLocation = {
                            address: startLocationData.address,
                            coordinates: startLocationData.coordinates,
                            timestamp: new Date().toISOString()
                        };
                    }

                    orderId = 0;
                }
                
                hideLoadingIndicator(loader);
                renderOrderList();
                saveUnfinishedOrders(); // Сохраняем заказы после добавления/редактирования

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
                recalculateOrderPrices();
                renderOrderList();
                saveUnfinishedOrders(); // Сохраняем заказы после удаления
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
            const loader = showLoadingIndicator();
            
            setTimeout(() => {
                routeStartTime = new Date();
                // Добавим запись в localStorage о начале маршрута
                localStorage.setItem('currentRouteStartTime', routeStartTime.toISOString());
                // Сохраняем текущие заказы в localStorage
                localStorage.setItem('currentRoute', JSON.stringify(orders));
                clearUnfinishedOrders(); // Очищаем сохраненные незавершенные заказы
                console.log(`Маршрут начат в ${routeStartTime.toLocaleTimeString()}`);
                
                hideLoadingIndicator(loader);
                showScreen('routeExecution');
                renderOrderList();
            }, 300);
        } else {
            await showAlert('Добавьте хотя бы один заказ для начала маршрута');
        }
    });
}

// Обработчик завершения маршрута
if (finishRouteBtn) {
    finishRouteBtn.addEventListener('click', async () => {
        if (routeStartTime) {
            const loader = showLoadingIndicator();
            
            setTimeout(() => {
                const endTime = new Date();
                const diff = endTime - routeStartTime;

                // Расчет времени выполнения
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                const formattedTime = `${hours}ч ${minutes}м ${seconds}с`;

                // Расчет дохода
                const income = orders.reduce((sum, order) => sum + order.price, 0) + settings.pickupRate;

                // Создаем объект маршрута
                const completedRoute = {
                    id: currentShift.routes.length + 1,
                    date: new Date(),
                    startTime: routeStartTime,
                    endTime: endTime,
                    executionTime: formattedTime,
                    executionTimeMs: diff,
                    income: income,
                    orders: [...orders],
                    // Добавляем информацию о стартовой точке
                    startLocation: startLocationData
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

                clearUnfinishedOrders(); // Очищаем незавершенные заказы после завершения маршрута
                
                hideLoadingIndicator(loader);
                showScreen('routeCompletion');
            }, 300);
        }
    });
}

// Обработчик кнопки ОК на экране завершения
if (okBtn) {
    okBtn.addEventListener('click', () => {
        // Сброс данных приложения
        orders = [];
        routeStartTime = null;
        clearUnfinishedOrders(); // Очищаем незавершенные заказы при сбросе
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

        const afterItems = Array.from(container.querySelectorAll('.order-item'));

        // Обновление порядка заказов в массиве
        const newOrders = [];
        afterItems.forEach(item => {
            const id = parseInt(item.getAttribute('data-id'));
            const order = orders.find(o => o.id === id);
            if (order) newOrders.push(order);
        });

        orders = newOrders;
        saveUnfinishedOrders(); // Сохраняем заказы после изменения порядка
        recalculateOrderPrices();
    }
}

async function recalculateOrderPrices() {
    const loader = showLoadingIndicator();
    
    try {
        const promises = [];
        
        orders.forEach((order, index) => {
            const lastOrder = index > 0 ? orders.at(index - 1) : { coordinates: startLocation };

            console.log('Пересчет расстояния...', lastOrder.coordinates, order.coordinates);

            promises.push(calculateDistance(lastOrder.coordinates, order.coordinates, 'map-orders').then(distance => {
                order.distance = distance;
                order.price = calculatePrice(order.weight, order.distance, order.isHighPriceDelivery);
            }));
        });

        await Promise.all(promises);

        console.log('Пересчитаны цены заказов:', orders);

        renderOrderList();
        saveUnfinishedOrders();
        
        hideLoadingIndicator(loader);
    } catch (error) {
        hideLoadingIndicator(loader);
        console.error('Ошибка при пересчете цен заказов:', error);
        showAlert('Произошла ошибка при пересчете цен заказов');
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

    nextOrderId = 0;
    
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
                    <span class="shift-value">${shift.startTime.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit'})}</span>
                    <span class="shift-value">${shift.startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${shift.endTime ? shift.endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Не завершена'}</span>
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
    
    // Добавляем информацию о стартовой точке маршрута, если она есть
    if (route.startLocation && route.startLocation.address) {
        const startLocationElement = document.createElement('div');
        startLocationElement.className = 'start-location-info';
        startLocationElement.innerHTML = `
            <div class="start-location-header">Стартовая точка: ${route.startLocation.address}</div>
        `;
        routeDetails.appendChild(startLocationElement);
    }

    route.orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'history-order-item';
        
        /*let startLocationInfo = '';
        // Добавляем информацию о стартовой точке заказа, если она отличается от стартовой точки маршрута
        if (order.startLocation && order.startLocation.address && 
            (!route.startLocation || order.startLocation.address !== route.startLocation.address)) {
            startLocationInfo = `
                <div class="order-start-location">
                    <span>Старт: ${order.startLocation.address}</span>
                </div>
            `;
        }*/
        
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
            ${startLocationInfo}
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
        
        const loader = showLoadingIndicator();
        setTimeout(() => {
            renderShiftsHistory();
            showScreen('shiftsHistory');
            sidebar.classList.remove('open');
            hideLoadingIndicator(loader);
        }, 100);
    });
}

// Обработчик для кнопки статистики
const showStatsBtn = document.getElementById('showStatsBtn');
if (showStatsBtn) {
    showStatsBtn.addEventListener('click', () => {
        setActiveMenuButton(showStatsBtn);
        
        // Показываем индикатор загрузки при обновлении статистики
        const loader = showLoadingIndicator();
        
        // Используем setTimeout, чтобы дать браузеру время отрисовать индикатор загрузки
        setTimeout(() => {
            updateStatistics();
            showScreen('statsScreen');
            sidebar.classList.remove('open');
            hideLoadingIndicator(loader);
        }, 100);
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

    const averageOrderPrice = totalOrders > 0 ? Math.round(totalEarnings / totalOrders) : 0;
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
    
    // Отрисовка графиков
    renderEarningsChart(dailyEarnings);
    renderWeekdayChart(completedShifts);
    renderOrdersDistributionChart(completedShifts);
    renderWeightDistributionChart(completedShifts);
    
    // Обновляем зону доставки
    updateDeliveryZoneSection();
    
    // Инициализируем обработчики для сворачивания/разворачивания секций статистики
    initStatsSectionToggles();
}

// Функция отрисовки графика доходов
function renderEarningsChart(dailyEarnings) {
    const ctx = document.getElementById('earningsChart').getContext('2d');
    
    // Создаем массив последовательных дат за последние 7 дней
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Устанавливаем время на начало дня
    
    const last30Days = [];
    for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        last30Days.push(date.toLocaleDateString());
    }
    
    // Получаем доходы для каждого дня (0, если нет доходов)
    const earnings = last30Days.map(dateStr => dailyEarnings[dateStr] || 0);

    // Уничтожаем предыдущий график, если он существует
    if (window.earningsChart instanceof Chart) {
        window.earningsChart.destroy();
    }

    // Дни недели на русском
    const weekdayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    window.earningsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last30Days.map(dateStr => {
                const date = new Date(dateStr);
                const isValidDate = !isNaN(date.getTime());
                
                // Форматируем дату только если она корректная
                let formattedDate = dateStr; // Используем исходную строку, если дата некорректная
                
                if (isValidDate) {
                    const dayOfWeek = weekdayNames[date.getDay()];
                    const formattedDay = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                    formattedDate = dayOfWeek + '\n' + formattedDay;
                }
                
                return formattedDate;
            }),
            datasets: [{
                label: 'Доход',
                data: earnings,
                backgroundColor: earnings.map(value => value > 0 ? '#ffd700' : 'rgba(255, 215, 0, 0.3)'),
                borderColor: '#ffd700',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label.replace('\n', ' ');
                        },
                        label: function(context) {
                            const value = context.raw;
                            return value > 0 ? `Доход: ${value}₽` : 'Нет дохода';
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#555'
                    },
                    ticks: {
                        color: '#ccc',
                        callback: value => `${value}₽`
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ccc',
                        padding: 5
                    },
                    // Устанавливаем количество видимых меток (7 дней)
                    min: 0,
                    max: 6,
                    // Включаем прокрутку
                    ticks: {
                        autoSkip: false,
                        color: '#ccc',
                        padding: 5
                    }
                }
            }
        }
    });

    // После инициализации графика сделаем видимыми только последние 7 дней
    if (last30Days.length > 7) {
        earningsChart.options.scales.x.min = last30Days.length - 7;
        earningsChart.options.scales.x.max = last30Days.length - 1;
        earningsChart.update();
    }
}

// Функция отрисовки графика по дням недели
function renderWeekdayChart(completedShifts) {
    const ctx = document.getElementById('weekdayChart').getContext('2d');
    
    // Подготавливаем данные по дням недели
    const weekdayData = Array(7).fill(0);
    const weekdayCounts = Array(7).fill(0);
    
    completedShifts.forEach(shift => {
        const dayOfWeek = shift.startTime.getDay();
        weekdayData[dayOfWeek == 0 ? 6 : dayOfWeek - 1] += shift.totalIncome;
        weekdayCounts[dayOfWeek == 0 ? 6 : dayOfWeek - 1]++;
    });

    // Рассчитываем средний доход по дням недели
    const averageWeekdayData = weekdayData.map((total, index) => 
        weekdayCounts[index] > 0 ? Math.round(total / weekdayCounts[index]) : 0
    );

    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    // Уничтожаем предыдущий график, если он существует
    if (window.weekdayChart instanceof Chart) {
        window.weekdayChart.destroy();
    }

    window.weekdayChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekdays,
            datasets: [{
                label: 'Средний доход',
                data: averageWeekdayData,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#555'
                    },
                    ticks: {
                        color: '#ccc',
                        callback: value => `${value}₽`
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ccc'
                    }
                }
            }
        }
    });
}

// Функция отрисовки графика распределения заказов
function renderOrdersDistributionChart(completedShifts) {
    const ctx = document.getElementById('ordersDistributionChart').getContext('2d');
    
    // Подготавливаем данные о количестве заказов по часам и дням недели
    const weekdayData = {
        0: Array(15).fill(0), // Понедельник    
        1: Array(15).fill(0), // Вторник
        2: Array(15).fill(0), // Среда
        3: Array(15).fill(0), // Четверг
        4: Array(15).fill(0), // Пятница
        5: Array(15).fill(0), // Суббота
        6: Array(15).fill(0), // Воскресенье
    };
    
    // Создаем объект для отслеживания уникальных дат для каждого дня недели и часа
    const processedDates = {
        0: Array(15).fill().map(() => new Set()), // Понедельник    
        1: Array(15).fill().map(() => new Set()), // Вторник
        2: Array(15).fill().map(() => new Set()), // Среда
        3: Array(15).fill().map(() => new Set()), // Четверг
        4: Array(15).fill().map(() => new Set()), // Пятница
        5: Array(15).fill().map(() => new Set()), // Суббота
        6: Array(15).fill().map(() => new Set()), // Воскресенье
    };
    
    completedShifts.forEach(shift => {
        shift.routes.forEach(route => {
            const routeDate = new Date(route.startTime);
            const dayOfWeek = routeDate.getDay();
            const mappedDayIndex = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
            const hour = routeDate.getHours();
            
            if (hour >= 8 && hour < 22) {
                const hourIndex = hour - 8;
                const dateKey = routeDate.toDateString();
                
                // Добавляем заказы текущего маршрута в соответствующий день и час
                const orderCount = route.orders.length;
                if (orderCount > 0) {
                    weekdayData[mappedDayIndex][hourIndex] += orderCount;
                    
                    // Добавляем дату в набор уникальных дат для этого дня недели и часа
                    processedDates[mappedDayIndex][hourIndex].add(dateKey);
                }
            }
        });
    });
    
    // Рассчитываем среднее арифметическое количество заказов для каждого дня недели и часа
    const averageWeekdayData = {};
    Object.keys(weekdayData).forEach(dayIndex => {
        averageWeekdayData[dayIndex] = weekdayData[dayIndex].map((total, hourIndex) => {
            const uniqueDaysCount = processedDates[dayIndex][hourIndex].size;
            return uniqueDaysCount > 0 ? Math.round((total / uniqueDaysCount) * 10) / 10 : 0;
        });
    });

    // Уничтожаем предыдущий график, если он существует
    if (window.ordersDistributionChart instanceof Chart) {
        window.ordersDistributionChart.destroy();
    }

    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const colors = ['#FF6384', '#36A2EB', '#4CAF50', '#FFC107', '#9C27B0', '#FF5722', '#607D8B'];

    window.ordersDistributionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 15}, (_, i) => `${i + 8}:00`),
            datasets: Object.entries(averageWeekdayData).map(([dayIndex, data], i) => ({
                label: weekdays[dayIndex],
                data: data,
                borderColor: colors[i],
                backgroundColor: colors[i] + '20',
                fill: true,
                tension: 0.4,
                borderWidth: 2
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ccc',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: 'Среднее количество заказов по часам и дням недели',
                    color: '#ccc',
                    font: {
                        size: 14
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#555'
                    },
                    ticks: {
                        color: '#ccc'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ccc',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Функция отрисовки графика распределения веса
function renderWeightDistributionChart(completedShifts) {
    const ctx = document.getElementById('weightDistributionChart').getContext('2d');
    
    // Подготавливаем данные о весе заказов
    const weightRanges = {
        '0-1': 0,
        '1-3': 0,
        '3-5': 0,
        '5-10': 0,
        '10+': 0
    };
    
    completedShifts.forEach(shift => {
        shift.routes.forEach(route => {
            route.orders.forEach(order => {
                const weight = order.weight;
                if (weight <= 1) weightRanges['0-1']++;
                else if (weight <= 3) weightRanges['1-3']++;
                else if (weight <= 5) weightRanges['3-5']++;
                else if (weight <= 10) weightRanges['5-10']++;
                else weightRanges['10+']++;
            });
        });
    });

    // Уничтожаем предыдущий график, если он существует
    if (window.weightDistributionChart instanceof Chart) {
        window.weightDistributionChart.destroy();
    }

    window.weightDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(weightRanges).map(range => `${range} кг`),
            datasets: [{
                data: Object.values(weightRanges),
                backgroundColor: [
                    '#4CAF50',
                    '#8BC34A',
                    '#CDDC39',
                    '#FFEB3B',
                    '#FFC107'
                ],
                borderWidth: 1,
                borderColor: '#333'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#ccc',
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Распределение заказов по весу',
                    color: '#ccc',
                    font: {
                        size: 14
                    }
               }
            }
        }
    });
}

// Функция генерации тестовых данных
function generateTestData() {
    const now = new Date();
    const testShifts = [];
    const routes = [];
    
    // Генерируем данные за последние 30 дней
    for (let i = 0; i < 30; i++) {
        const shiftDate = new Date(now);
        shiftDate.setDate(now.getDate() - i);
        
        // Случайное время начала смены (между 8 и 11 утра)
        shiftDate.setHours(8 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0);
        
        const shift = {
            id: testShifts.length + 1,
            startTime: new Date(shiftDate),
            endTime: new Date(shiftDate),
            routes: [],
            totalIncome: 0
        };
        
        // Устанавливаем время окончания (8-12 часов после начала)
        shift.endTime.setHours(shift.startTime.getHours() + 8 + Math.floor(Math.random() * 4));
        
        // Генерируем 2-4 маршрута за смену
        const routesCount = 2 + Math.floor(Math.random() * 3);
        let routeStartTime = new Date(shift.startTime);
        
        for (let j = 0; j < routesCount; j++) {
            const route = {
                id: j + 1,
                startTime: new Date(routeStartTime),
                endTime: new Date(routeStartTime),
                orders: [],
                income: 0
            };
            
            // Генерируем 3-7 заказов на маршрут
            const ordersCount = 3 + Math.floor(Math.random() * 5);
            
            for (let k = 0; k < ordersCount; k++) {
                const order = {
                    id: k + 1,
                    address: `Тестовый адрес ${k + 1}`,
                    weight: 1 + Math.random() * 9, // вес от 1 до 10 кг
                    price: 200 + Math.floor(Math.random() * 800), // цена от 200 до 1000
                    distance: 1 + Math.random() * 4, // расстояние от 1 до 5 км
                    coordinates: [
                        56.307861 + (Math.random() - 0.5) * 0.018, // ~1 км в широте
                        43.989188 + (Math.random() - 0.5) * 0.028  // ~1 км в долготе
                    ],
                    completed: true
                };
                route.income += order.price;
                route.orders.push(order);
            }
            
            // Добавляем 1-2 часа на выполнение маршрута
            route.endTime.setHours(route.startTime.getHours() + 1 + Math.floor(Math.random() * 2));
            routeStartTime = new Date(route.endTime);
            
            shift.routes.push(route);
            shift.totalIncome += route.income;
            routes.push(route);
        }
        
        testShifts.push(shift);
    }
    
    // Сохраняем тестовые данные
    shiftsHistory = testShifts;
    localStorage.setItem('shiftsHistory', JSON.stringify(shiftsHistory));
    localStorage.setItem('routeHistory', JSON.stringify(routes));
    // Обновляем статистику
    updateStatistics();
    showAlert('Тестовые данные успешно сгенерированы');
}

//Добавляем обработчик для кнопки генерации тестовых данных
const generateTestDataBtn = document.createElement('button');
generateTestDataBtn.textContent = 'Сгенерировать тестовые данные';
generateTestDataBtn.className = 'modal-btn';
generateTestDataBtn.style.position = 'fixed';
generateTestDataBtn.style.bottom = '20px';
generateTestDataBtn.style.right = '20px';
generateTestDataBtn.style.zIndex = '1000';

generateTestDataBtn.addEventListener('click', generateTestData);
//document.body.appendChild(generateTestDataBtn);
   
// Инициализация
updateShiftControls();

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Получаем базовый путь из текущего URL
        const basePath = window.location.pathname.replace(/\/[^/]*$/, '/');
        
        navigator.serviceWorker.register(basePath + 'sw.js')
            .then(registration => {
                console.log('ServiceWorker успешно зарегистрирован:', registration);
            })
            .catch(error => {
                console.log('Ошибка регистрации ServiceWorker:', error);
            });
    });
}

// Функция для сохранения незавершенных заказов
function saveUnfinishedOrders() {
    if (!routeStartTime && orders.length > 0) {
        localStorage.setItem('unfinishedOrders', JSON.stringify(orders));
        localStorage.setItem('nextOrderId', nextOrderId.toString());
        console.log('Незавершенные заказы сохранены:', orders);
    }

    if (orders.length === 0) {
        localStorage.removeItem('unfinishedOrders');
        localStorage.removeItem('nextOrderId');
    }
}

// Функция для загрузки незавершенных заказов
function loadUnfinishedOrders() {
    const savedOrders = localStorage.getItem('unfinishedOrders');
    const savedNextOrderId = localStorage.getItem('nextOrderId');
    
    if (savedOrders && !routeStartTime) {
        try {
            orders = JSON.parse(savedOrders);
            if (savedNextOrderId) {
                nextOrderId = parseInt(savedNextOrderId);
            }
            console.log('Незавершенные заказы загружены:', orders);
            showScreen('orderList');
            renderOrderList();
            return true;
        } catch (error) {
            console.error('Ошибка при загрузке незавершенных заказов:', error);
            return false;
        }
    }
    return false;
}

// Функция для очистки незавершенных заказов
function clearUnfinishedOrders() {
    localStorage.removeItem('unfinishedOrders');
    localStorage.removeItem('nextOrderId');
}

// Функции для генерации и применения цветовой палитры
function generateColorPalette(primaryColor) {
    // Конвертировать HEX в RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // Конвертировать RGB в HEX
    const rgbToHex = (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };

    // Затемнение цвета
    const darken = (hex, amount) => {
        const rgb = hexToRgb(hex);
        const darkenColor = {
            r: rgb.r * (1 - amount),
            g: rgb.g * (1 - amount),
            b: rgb.b * (1 - amount)
        };
        return rgbToHex(darkenColor.r, darkenColor.g, darkenColor.b);
    };

    // Осветление цвета
    const lighten = (hex, amount) => {
        const rgb = hexToRgb(hex);
        const lightenColor = {
            r: rgb.r + (255 - rgb.r) * amount,
            g: rgb.g + (255 - rgb.g) * amount,
            b: rgb.b + (255 - rgb.b) * amount
        };
        return rgbToHex(lightenColor.r, lightenColor.g, lightenColor.b);
    };

    // Получение дополнительного (акцент) цвета
    const getAccentColor = (hex) => {
        const rgb = hexToRgb(hex);
        
        // Создание золотистого акцента на основе основного цвета
        let accentRgb = {
            r: Math.min(255, rgb.r * 1.3),
            g: Math.min(255, rgb.g * 1.2),
            b: Math.max(0, rgb.b * 0.7)
        };
        
        return rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b);
    };

    return {
        primary: primaryColor,
        primaryDark: darken(primaryColor, 0.2),
        primaryLight: lighten(primaryColor, 0.2),
        accent: getAccentColor(primaryColor)
    };
}

function applyColorPalette(palette) {
    document.documentElement.style.setProperty('--primary-color', palette.primary);
    document.documentElement.style.setProperty('--primary-dark', palette.primaryDark);
    document.documentElement.style.setProperty('--primary-light', palette.primaryLight);
    document.documentElement.style.setProperty('--accent-color', palette.accent);
    
    // Обновляем тег meta theme-color для поддержки мобильных устройств
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', palette.primary);
    }
}
    
    // Обработчик изменения цвета темы
    const themeColorInput = document.getElementById('themeColor');
    if (themeColorInput) {
        // Инициализация превью цветовой палитры при загрузке
        const initialPalette = generateColorPalette(settings.themeColor);
        document.querySelector('.primary-color-sample').style.backgroundColor = initialPalette.primary;
        document.querySelector('.primary-dark-sample').style.backgroundColor = initialPalette.primaryDark;
        document.querySelector('.primary-light-sample').style.backgroundColor = initialPalette.primaryLight;
        document.querySelector('.accent-color-sample').style.backgroundColor = initialPalette.accent;

        themeColorInput.addEventListener('input', function() {
            const color = this.value;
            const palette = generateColorPalette(color);
            
            // Обновляем превью
            document.querySelector('.primary-color-sample').style.backgroundColor = palette.primary;
            document.querySelector('.primary-dark-sample').style.backgroundColor = palette.primaryDark;
            document.querySelector('.primary-light-sample').style.backgroundColor = palette.primaryLight;
            document.querySelector('.accent-color-sample').style.backgroundColor = palette.accent;
        });
    }

// Функция для получения всех стартовых точек из localStorage за последние 30 дней
function getStartLocationsFromStorage() {
    const startLocations = new Map(); // Используем Map для хранения уникальных точек по адресу
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Проверяем текущую стартовую точку
    const savedStartLocation = localStorage.getItem('startLocation');
    if (savedStartLocation) {
        try {
            const locationData = JSON.parse(savedStartLocation);
            if (locationData && locationData.coordinates) {
                startLocations.set(locationData.coordinates, locationData);
            }
        } catch (error) {
            console.error('Ошибка при чтении стартовой точки:', error);
        }
    }
    
    // Проверяем историю маршрутов
    const savedHistory = localStorage.getItem('routeHistory');
    if (savedHistory) {
        try {
            const routes = JSON.parse(savedHistory);
            routes.forEach(route => {
                const routeDate = new Date(route.date);
                if (route.startLocation && route.startLocation.coordinates) {
                    startLocations.set(route.startLocation.coordinates, route.startLocation);
                }
                
                // Если в заказах есть информация о стартовой точке
                if (route.orders && route.orders.length > 0 && route.orders[0].startLocation) {
                    startLocations.set(route.orders[0].startLocation.coordinates, route.orders[0].startLocation);
                }
            });
        } catch (error) {
            console.error('Ошибка при чтении истории маршрутов:', error);
        }
    }
    
    // Проверяем историю смен
    const savedShifts = localStorage.getItem('shiftsHistory');
    if (savedShifts) {
        try {
            const shifts = JSON.parse(savedShifts);
            shifts.forEach(shift => {
                const shiftDate = new Date(shift.startTime);
                if (shiftDate >= thirtyDaysAgo && shift.routes) {
                    shift.routes.forEach(route => {
                        if (route.startLocation && route.startLocation.coordinates) {
                            startLocations.set(route.startLocation.coordinates, route.startLocation);
                        }
                        
                        // Проверяем заказы в маршруте
                        if (route.orders && route.orders.length > 0) {
                            route.orders.forEach(order => {
                                if (order.startLocation && order.startLocation.coordinates) {
                                    startLocations.set(order.startLocation.coordinates, order.startLocation);
                                }
                            });
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Ошибка при чтении истории смен:', error);
        }
    }
    
    // Добавляем точку из настроек, если нет других точек
    if (startLocations.size === 0 && settings.defaultStartLocation) {
        startLocations.set(settings.defaultStartLocation, {
            address: settings.defaultStartLocation,
            coordinates: null // Координаты будут получены при геокодировании
        });
    }
    
    return Array.from(startLocations.values());
}

// Функция для получения всех заказов для заданной стартовой точки
function getOrdersForStartLocation(startLocationAddress) {
    const orders = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Получаем заказы из истории маршрутов
    const savedHistory = localStorage.getItem('routeHistory');
    if (savedHistory) {
        try {
            const routes = JSON.parse(savedHistory);
            routes.forEach(route => {
                const routeDate = new Date(route.startTime);
                if (routeDate >= thirtyDaysAgo) {
                    // Проверяем, совпадает ли стартовая точка маршрута
                    let matchesStartLocation = false || true;
                    
                    if (route.startLocation && route.startLocation.coordinates === startLocationAddress) {
                        matchesStartLocation = true;
                    } else if (route.orders && route.orders.length > 0 && route.orders[0].startLocation && 
                               route.orders[0].startLocation.coordinates === startLocationAddress) {
                        matchesStartLocation = true;
                    }
                    
                    if (matchesStartLocation && route.orders && route.orders.length > 0) {
                        route.orders.forEach(order => {
                            if (order.coordinates) {
                                orders.push({
                                    address: order.address,
                                    coordinates: order.coordinates,
                                    weight: order.weight || 1,
                                    date: routeDate
                                });
                            }
                        });
                    }
                }
            });
        } catch (error) {
            console.error('Ошибка при получении заказов из истории маршрутов:', error);
        }
    }
    
    // Получаем заказы из истории смен
    const savedShifts = localStorage.getItem('shiftsHistory');
    if (savedShifts) {
        try {
            const shifts = JSON.parse(savedShifts);
            shifts.forEach(shift => {
                const shiftDate = new Date(shift.startTime);
                if (shiftDate >= thirtyDaysAgo && shift.routes) {
                    shift.routes.forEach(route => {
                        // Проверяем, совпадает ли стартовая точка маршрута
                        let matchesStartLocation = false;
                        
                        if (route.startLocation && route.startLocation.coordinates === startLocationAddress) {
                            matchesStartLocation = true;
                        } else if (route.orders && route.orders.length > 0 && route.orders[0].startLocation && 
                                  route.orders[0].startLocation.coordinates === startLocationAddress) {
                            matchesStartLocation = true;
                        }
                        
                        if (matchesStartLocation && route.orders && route.orders.length > 0) {
                            route.orders.forEach(order => {
                                if (order.coordinates) {
                                    orders.push({
                                        address: order.address,
                                        coordinates: order.coordinates,
                                        weight: order.weight || 1,
                                        date: new Date(route.startTime)
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Ошибка при получении заказов из истории смен:', error);
        }
    }
    
    return orders;
}

// Функция для инициализации карты с зоной доставки
function initDeliveryZoneMap(startLocation, clientOrders) {
    const mapContainer = document.getElementById('deliveryZoneMap');
    if (!mapContainer) return;
    
    // Очищаем контейнер карты
    mapContainer.innerHTML = '';
    
    // Если нет данных, показываем сообщение
    if (!startLocation || !startLocation.coordinates || !clientOrders || clientOrders.length === 0) {
        mapContainer.innerHTML = '<div class="no-data-message">Недостаточно данных для построения зоны доставки</div>';
        return;
    }
    
    // Парсим координаты стартовой точки
    let startCoords;
    try {
        if (typeof startLocation.coordinates === 'string') {
            startCoords = startLocation.coordinates.split(',').map(Number);
        } else if (Array.isArray(startLocation.coordinates)) {
            startCoords = startLocation.coordinates;
        } else {
            throw new Error('Неверный формат координат');
        }
    } catch (error) {
        console.error('Ошибка при парсинге координат стартовой точки:', error);
        mapContainer.innerHTML = '<div class="no-data-message">Ошибка при обработке координат</div>';
        return;
    }
    
    // Создаем карту
    const myMap = new ymaps.Map('deliveryZoneMap', {
        center: startCoords,
        zoom: 12,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
    });
    
    // Добавляем стартовую точку на карту
    const startMarker = new ymaps.Placemark(startCoords, {
        hintContent: startLocation.address,
        balloonContent: `<strong>Стартовая точка:</strong> ${startLocation.address}`
    }, {
        preset: 'islands#greenDotIcon',
        iconColor: '#3caa3c'
    });
    myMap.geoObjects.add(startMarker);
    
    // Добавляем точки заказов на карту
    const clientMarkers = [];
    clientOrders.forEach(order => {
        let orderCoords;
        try {
            if (typeof order.coordinates === 'string') {
                orderCoords = order.coordinates.split(',').map(Number);
            } else if (Array.isArray(order.coordinates)) {
                orderCoords = order.coordinates;
            } else {
                return; // Пропускаем заказ с неверными координатами
            }
            
            const marker = new ymaps.Placemark(orderCoords, {
                hintContent: order.address,
                balloonContent: `
                    <strong>Адрес:</strong> ${order.address}<br>
                    <strong>Вес:</strong> ${order.weight} кг<br>
                    <strong>Дата:</strong> ${order.date.toLocaleDateString()}
                `
            }, {
                preset: 'islands#blueDotIcon'
            });
            const heatmapcheckbox = document.getElementById('heatmapCheckbox');
            if (!(heatmapcheckbox && heatmapcheckbox.checked)) {
                myMap.geoObjects.add(marker);   
            }
            clientMarkers.push({coords: orderCoords, weight: order.weight});
        } catch (error) {
            console.error('Ошибка при добавлении метки заказа:', error);
        }
    });
    
    // Создаем полигон зоны доставки
    //createDeliveryZonePolygon(myMap, startCoords, clientMarkers.map(m => m.coords));
    
    // Проверяем, нужно ли создать тепловую карту
    const heatmapCheckbox = document.getElementById('heatmapCheckbox');
    if (heatmapCheckbox && heatmapCheckbox.checked) {
        createHeatmap(myMap, clientMarkers);
    }
    
    // Подгоняем масштаб карты, чтобы были видны все точки
    myMap.setBounds(myMap.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 30
    });
}

// Функция для создания полигона зоны доставки
/*function createDeliveryZonePolygon(map, startCoords, orderCoords) {
    if (!orderCoords || orderCoords.length < 3) {
        return; // Нужно минимум 3 точки для создания полигона
    }
    
    // Преобразуем координаты в формат для алгоритма выпуклой оболочки
    const points = [];
    points.push({x: startCoords[0], y: startCoords[1]}); // Добавляем стартовую точку
    
    orderCoords.forEach(coords => {
        points.push({x: coords[0], y: coords[1]});
    });
    
    // Строим выпуклую оболочку
    const hullPoints = getConvexHull(points);
    
    // Преобразуем обратно в формат для Яндекс.Карт
    const hullCoordinates = hullPoints.map(point => [point.x, point.y]);
    
    // Создаем и добавляем полигон на карту
    const polygon = new ymaps.Polygon([hullCoordinates], {
        hintContent: 'Зона доставки'
    }, {
        fillColor: '#ff990055', // Полупрозрачный оранжевый
        strokeColor: '#ff6600',
        strokeWidth: 3,
        strokeStyle: 'solid'
    });
    
    map.geoObjects.add(polygon);
}*/

// Функция для создания тепловой карты
function createHeatmap(map, points) {
    if (!points || points.length === 0) return;
    
    // Преобразуем точки в формат для тепловой карты
    const heatmapData = points.map(point => {
        return {
            weight: point.weight || 1,
            coordinates: point.coords
        };
    });

    ymaps.modules.require(['Heatmap'], function (Heatmap) {
    const heatmap = new Heatmap(heatmapData.map(r => r.coordinates), {
        radius: 15,
        dissipating: true,
        opacity: 0.75,
        gradient: {
            0.1: 'rgba(128, 255, 0, 0.7)',
            0.2: 'rgba(255, 255, 0, 0.8)',
            0.7: 'rgba(234, 72, 58, 0.9)',
            1.0: 'rgba(162, 36, 25, 1)'
        }
    });
    
    heatmap.setMap(map);
   });
    

}

// Функция для получения выпуклой оболочки (алгоритм Грэхема)
function getConvexHull(points) {
    // Если точек меньше 3, выпуклая оболочка это и есть сами точки
    if (points.length < 3) return points;
    
    // Находим точку с минимальной y-координатой (и самой левой, если таких несколько)
    let bottomPoint = points[0];
    for (let i = 1; i < points.length; i++) {
        if (points[i].y < bottomPoint.y || (points[i].y === bottomPoint.y && points[i].x < bottomPoint.x)) {
            bottomPoint = points[i];
        }
    }
    
    // Сортируем точки по полярному углу относительно bottomPoint
    points.sort((a, b) => {
        const angleA = Math.atan2(a.y - bottomPoint.y, a.x - bottomPoint.x);
        const angleB = Math.atan2(b.y - bottomPoint.y, b.x - bottomPoint.x);
        
        if (angleA === angleB) {
            // Если углы равны, выбираем более удаленную точку
            const distA = Math.pow(a.x - bottomPoint.x, 2) + Math.pow(a.y - bottomPoint.y, 2);
            const distB = Math.pow(b.x - bottomPoint.x, 2) + Math.pow(b.y - bottomPoint.y, 2);
            return distA - distB;
        }
        
        return angleA - angleB;
    });
    
    // Строим выпуклую оболочку
    const hull = [points[0], points[1]];
    
    for (let i = 2; i < points.length; i++) {
        while (hull.length > 1 && !isLeftTurn(hull[hull.length - 2], hull[hull.length - 1], points[i])) {
            hull.pop();
        }
        hull.push(points[i]);
    }
    
    return hull;
}

// Вспомогательная функция для проверки поворота налево
function isLeftTurn(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
}

// Функция создания HTML-элементов для секции зоны доставки
function createDeliveryZoneSection() {
    const statsScreen = document.querySelector('.stats-container');
    if (!statsScreen) return;
    
    // Проверяем, не создана ли уже секция
    let deliveryZoneSection = document.querySelector('.delivery-zone-section');
    if (deliveryZoneSection) return;
    
    // Создаем секцию для зоны доставки
    deliveryZoneSection = document.createElement('div');
    deliveryZoneSection.className = 'stats-section delivery-zone-section';
    deliveryZoneSection.innerHTML = `
        <div class="stats-section-header">
            <h3>Зона доставки</h3>
            <div class="section-toggle">▲</div>
        </div>
        <div class="stats-section-content">
            <div class="delivery-zone-controls">
                <div class="select-container">
                    <label for="startLocationSelect">Выберите стартовую точку:</label>
                    <select id="startLocationSelect">
                        <option value="">-- Выберите точку старта --</option>
                    </select>
                </div>
                <div class="checkbox-container">
                    <input type="checkbox" id="heatmapCheckbox">
                    <label for="heatmapCheckbox">Показать тепловую карту</label>
                </div>
            </div>
            <div id="deliveryZoneMap" class="map-container"></div>
        </div>
    `;
    
    // Добавляем секцию в конец экрана статистики
    statsScreen.appendChild(deliveryZoneSection);
    
    // Добавляем стили для новой секции
    const style = document.createElement('style');
    style.textContent = `
        .delivery-zone-section {
            margin-top: 30px;
            padding-bottom: 40px;
        }
        .delivery-zone-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 15px 0;
            flex-wrap: wrap;
        }
        .select-container {
            flex: 1;
            margin-right: 20px;
            min-width: 250px;
        }
        .select-container label {
            display: block;
            margin-bottom: 5px;
        }
        .select-container select {
            width: 100%;
            padding: 8px 12px;
            border-radius: 4px;
            background-color: #333;
            color: #fff;
            border: 1px solid #555;
        }
        .checkbox-container {
            display: flex;
            align-items: center;
        }
        .checkbox-container input {
            margin-right: 8px;
        }
        .map-container {
            width: 100%;
            height: 400px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        .no-data-message {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #aaa;
            font-style: italic;
            background-color: #333;
        }
        .start-location-info {
            background-color: rgba(0, 150, 0, 0.1);
            border-left: 3px solid #00aa00;
            padding: 8px 12px;
            margin-bottom: 10px;
            border-radius: 4px;
        }
        .start-location-header {
            font-weight: bold;
            color: #00cc00;
        }
        .order-start-location {
            margin-top: 4px;
            font-size: 0.9em;
            color: #999;
            border-top: 1px dashed #555;
            padding-top: 4px;
        }
    `;
    document.head.appendChild(style);
    
    // Добавляем обработчики событий
    const startLocationSelect = document.getElementById('startLocationSelect');
    const heatmapCheckbox = document.getElementById('heatmapCheckbox');
    
    if (startLocationSelect) {
        startLocationSelect.addEventListener('change', updateDeliveryZoneMap);
    }
    
    if (heatmapCheckbox) {
        heatmapCheckbox.addEventListener('change', updateDeliveryZoneMap);
    }
    
    // После добавления секции инициализируем обработчики
    initStatsSectionToggles();
}

// Функция для заполнения выпадающего списка стартовых точек
function populateStartLocationSelect() {
    const select = document.getElementById('startLocationSelect');
    if (!select) return;
    
    // Очищаем список
    select.innerHTML = '';
    
    // Получаем все стартовые точки
    const startLocations = getStartLocationsFromStorage();
    
    // Заполняем список
    startLocations.forEach(location => {
        if (location && location.coordinates) {
            const option = document.createElement('option');
            option.value = location.coordinates;
            option.textContent = location.address;
            select.appendChild(option);
        }
    });
}

// Функция для обновления карты с зоной доставки
function updateDeliveryZoneMap() {
    const select = document.getElementById('startLocationSelect');
    if (!select) return;
    
    const selectedAddress = select.value;
    if (!selectedAddress) {
        const mapContainer = document.getElementById('deliveryZoneMap');
        if (mapContainer) {
            mapContainer.innerHTML = '<div class="no-data-message">Выберите стартовую точку</div>';
        }
        return;
    }
    
    // Ищем данные о выбранной стартовой точке
    const startLocations = getStartLocationsFromStorage();
    const selectedLocation = startLocations.find(loc => loc.coordinates === selectedAddress);
    
    if (!selectedLocation) {
        console.error('Не найдена информация о выбранной стартовой точке');
        return;
    }
    
    // Если у стартовой точки нет координат, пытаемся получить их
    if (!selectedLocation.coordinates) {
        const loader = showLoadingIndicator();
        geocodeAddress(selectedAddress)
            .then(coordinates => {
                hideLoadingIndicator(loader);
                selectedLocation.coordinates = coordinates;
                const clientOrders = getOrdersForStartLocation(selectedAddress);
                ymaps.ready(() => initDeliveryZoneMap(selectedLocation, clientOrders));
            })
            .catch(error => {
                hideLoadingIndicator(loader);
                console.error('Ошибка при геокодировании стартовой точки:', error);
                const mapContainer = document.getElementById('deliveryZoneMap');
                if (mapContainer) {
                    mapContainer.innerHTML = '<div class="no-data-message">Не удалось получить координаты для выбранной точки</div>';
                }
            });
    } else {
        // Если координаты есть, сразу отображаем карту
        const clientOrders = getOrdersForStartLocation(selectedAddress);
        ymaps.ready(() => initDeliveryZoneMap(selectedLocation, clientOrders));
    }
}

// Функция обновления секции с зоной доставки
function updateDeliveryZoneSection() {
    // Создаем секцию, если ее еще нет
    createDeliveryZoneSection();
    
    // Заполняем выпадающий список стартовых точек
    populateStartLocationSelect();
}

// Добавляем создание секции зоны доставки при инициализации
document.addEventListener('DOMContentLoaded', function() {
    // Другие инициализации...
    createDeliveryZoneSection();
});

// Инициализация карты доставки при загрузке страницы
if (typeof ymaps !== 'undefined') {
    ymaps.ready(() => {
        // При загрузке страницы создаем секцию с картой доставки
        createDeliveryZoneSection();
        populateStartLocationSelect();
        
        // Если есть текущая стартовая точка, выбираем ее по умолчанию
        const startLocationSelect = document.getElementById('startLocationSelect');
        const savedStartLocation = localStorage.getItem('startLocation');
        
        if (startLocationSelect && savedStartLocation) {
            try {
                const locationData = JSON.parse(savedStartLocation);
                if (locationData && locationData.address) {
                    // Выбираем текущую точку в выпадающем списке
                    const options = Array.from(startLocationSelect.options);
                    const option = options.find(opt => opt.value === locationData.address);
                    
                    if (option) {
                        option.selected = true;
                        // Обновляем карту с зоной доставки
                        updateDeliveryZoneMap();
                    }
                }
            } catch (error) {
                console.error('Ошибка при выборе стартовой точки:', error);
            }
        }
    });
} else {
    console.warn('API Яндекс.Карт не загружено. Функциональность карты доставки недоступна.');
}

// Функция для инициализации обработчиков сворачивания/разворачивания секций статистики
function initStatsSectionToggles() {
    const statsSectionHeaders = document.querySelectorAll('.stats-section-header');
    
    statsSectionHeaders.forEach(header => {
        // Проверяем, не инициализирован ли уже обработчик
        if (header.getAttribute('data-initialized') === 'true') {
            return;
        }
        
        const content = header.nextElementSibling;
        const toggle = header.querySelector('.section-toggle');
        
        // Убеждаемся, что содержимое секции видимо по умолчанию
        content.classList.remove('hidden');
        toggle.textContent = '▲';
        toggle.classList.remove('rotate');
        
        header.addEventListener('click', (event) => {
            content.classList.toggle('hidden');
            toggle.textContent = content.classList.contains('hidden') ? '▼' : '▲';
            toggle.classList.toggle('rotate');
            
            // Если секция открывается и удерживается клавиша Alt, закрываем все остальные секции
            if (!content.classList.contains('hidden') && event.altKey) {
                closeOtherSections(header);
            }
            
            // Если контент скрыт, прокручиваем к заголовку, чтобы он был виден
            if (content.classList.contains('hidden')) {
                header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
        
        // Отмечаем, что обработчик уже инициализирован
        header.setAttribute('data-initialized', 'true');
    });
}

// Функция для закрытия всех секций, кроме текущей
function closeOtherSections(currentHeader) {
    const allHeaders = document.querySelectorAll('.stats-section-header');
    
    allHeaders.forEach(header => {
        if (header !== currentHeader) {
            const content = header.nextElementSibling;
            const toggle = header.querySelector('.section-toggle');
            
            content.classList.add('hidden');
            toggle.textContent = '▼';
            toggle.classList.add('rotate');
        }
    });
}
