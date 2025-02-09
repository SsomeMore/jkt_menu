(function () {
    let MenuTpl = `
    <div id="menu_{{_namespace}}_{{_name}}" class="menu{{#align}} align-{{align}}{{/align}}">
        <div class="head">
            <span>{{{title}}}</span>
        </div>
        <div class="desciptions">
            {{{subtext}}}
            <div class="close-button">
                {{#lastmenu}}
                <i class="fa-solid fa-arrow-left"></i>
                {{/lastmenu}}
                {{^lastmenu}}
                <i class="fa-solid fa-xmark"></i>
                {{/lastmenu}}
            </div>
        </div>
        <div class="topline"></div>
        <div class="menu-items">
            {{#isGrid}}
            <div class="grid-container">
            {{#elements}}
            <div class="grid-item {{#selected}}selected{{/selected}}">
                {{#image}}<img src="nui://vorp_inventory/html/img/items/{{{image}}}.png"></img>{{/image}}
                {{^image}}
                <div id="item-label" {{#image}}class="image-pad"{{/image}}>{{{label}}}</div>
                {{/image}}
            </div>
            {{/elements}}
            </div>
             {{/isGrid}}
             {{^isGrid}}
            {{#elements}}
            {{#isNotSelectable}}
            <div class="menu-item menu-option {{#isSlider}}slider{{/isSlider}}" {{#itemHeight}} style="height:{{{itemHeight}}}!important"{{/itemHeight}}>
            {{/isNotSelectable}}
               {{^isNotSelectable}}
                <div class="menu-item menu-option {{#selected}}selected{{/selected}} {{#isSlider}}slider{{/isSlider}}" {{#itemHeight}} style="height:{{{itemHeight}}}!important"{{/itemHeight}}>
                {{/isNotSelectable}}
                    {{#image}}<img class="item-image" src="nui://vorp_inventory/html/img/items/{{{image}}}.png"></img>{{/image}}
                    <div id="item-label" {{#image}}class="image-pad"{{/image}}>{{{label}}}</div>
                    <div class="arrows">
                        {{#isSlider}}
                        <div class="slider-controls">
                            <button class="slider-btn left-btn"><i class="fa-solid fa-circle-arrow-left"></i></button>
                            <div id="slider-label">{{{sliderLabel}}}</div>
                            <button class="slider-btn right-btn"><i class="fa-solid fa-circle-arrow-right"></i></button>
                        </div>
                        {{/isSlider}}
                    </div>
                </div>
            {{/elements}}
          {{/isGrid}}
        </div>
        <div class="scrollbottom"></div>
        {{#elements}}
            {{#selected}}
                <div class="options-amount">{{{list_id}}}/{{{list_max}}}</div>
                <br>
                <div class="desciption">{{{desc}}}</div>
            {{/selected}}
        {{/elements}}
        <br>
    </div>`;

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    $(document).on('mousedown', '.head', function(e) {
        const menuElement = $(this).parent()[0];
        const menuId = menuElement.id;
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        const savedPosition = localStorage.getItem(menuId);
        if (savedPosition) {
            const pos = JSON.parse(savedPosition);
            xOffset = pos.x;
            yOffset = pos.y;
            setTranslate(pos.x, pos.y, menuElement);
        }

        if (e.target === this) {
            isDragging = true;
        }

        function dragHandler(e) {
            if (isDragging) {
                e.preventDefault();
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, menuElement);
                
                localStorage.setItem(menuId, JSON.stringify({
                    x: currentX,
                    y: currentY
                }));
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        $(document).on('mousemove', dragHandler);
        
        $(document).on('mouseup', function() {
            isDragging = false;
            $(document).off('mousemove', dragHandler);
        });
    });

    function scrollToElement(element, block = "nearest") {
        if (element) {
            const menuContainer = document.querySelector(".menu .menu-items");
            const elementRect = element.getBoundingClientRect();
            const containerRect = menuContainer.getBoundingClientRect();

            if (elementRect.bottom > containerRect.bottom || elementRect.top < containerRect.top) {
                element.scrollIntoView({
                    behavior: "auto",
                    block: block
                });
            }
        }
    }

    window.MenuData = {
        ResourceName: "jkt_menu",
        opened: {},
        focus: [],
        pos: {},
    };
    let lastmenu;
    let currentNamespace, currentName, menuElements;

    $(document).on('click', '.menu-option', function(event) {
        event.stopPropagation();
        
        const index = $(this).index();
        const focused = MenuData.getFocused();
        
        if (focused) {
            const menu = MenuData.opened[focused.namespace][focused.name];
            const currentIndex = MenuData.pos[focused.namespace][focused.name];

            if (currentIndex === index) {
                MenuData.submit(focused.namespace, focused.name, menu.elements[index]);
            } else {
                $('.menu-option').removeClass('selected');
                $(this).addClass('selected');
                MenuData.pos[focused.namespace][focused.name] = index;
                for (let i = 0; i < menu.elements.length; i++) {
                    menu.elements[i].selected = (i === index);
                }

                $.post('https://' + MenuData.ResourceName + '/update_last_selected', JSON.stringify({
                    _namespace: focused.namespace,
                    _name: focused.name,
                    selected: index
                }));

                MenuData.change(focused.namespace, focused.name, menu.elements[index]);
                
                const menuElement = document.getElementById(`menu_${focused.namespace}_${focused.name}`);
                const currentTransform = menuElement.style.transform;
                
                MenuData.render();
                
                const newMenuElement = document.getElementById(`menu_${focused.namespace}_${focused.name}`);
                if (newMenuElement) {
                    newMenuElement.style.transform = currentTransform;
                }
                
                $.post("https://" + MenuData.ResourceName + "/playsound");
            }
        }
    });

    $(document).on('click', '.left-btn', function(e) {
        e.stopPropagation();
        const focused = MenuData.getFocused();
        if (focused) {
            const menu = MenuData.opened[focused.namespace][focused.name];
            const pos = MenuData.pos[focused.namespace][focused.name];
            const elem = menu.elements[pos];
            
            // Select the button's parent menu-option
            $(this).closest('.menu-option').click();

            if (elem.type === 'slider') {
                let min = typeof elem.min == "undefined" ? 0 : elem.min;
                if (elem.value > min) {
                    if (typeof elem.hop != "undefined") {
                        if (Number.isInteger(elem.hop)) {
                            elem.value = elem.value - elem.hop;
                        } else {
                            elem.value = (Number(elem.value) - Number(elem.hop)).toFixed(1);
                        }
                        elem.value = Number(elem.value);
                        if (elem.value < min) {
                            elem.value = min;
                        }
                    } else {
                        elem.value--;
                    }
                    MenuData.change(focused.namespace, focused.name, elem);
                    MenuData.submit(focused.namespace, focused.name, elem);
                    MenuData.render();
                }
            }
        }
    });

    $(document).on('click', '.right-btn', function(e) {
        e.stopPropagation();
        const focused = MenuData.getFocused();
        if (focused) {
            const menu = MenuData.opened[focused.namespace][focused.name];
            const pos = MenuData.pos[focused.namespace][focused.name];
            const elem = menu.elements[pos];

            // Select the button's parent menu-option
            $(this).closest('.menu-option').click();

            if (elem.type === 'slider') {
                if (typeof elem.options != "undefined" && elem.value < elem.options.length - 1) {
                    elem.value++;
                    MenuData.change(focused.namespace, focused.name, elem);
                    MenuData.submit(focused.namespace, focused.name, elem);
                }

                if (typeof elem.max != "undefined" && elem.value < elem.max) {
                    if (typeof elem.hop != "undefined") {
                        let min = typeof elem.min == "undefined" ? 0 : elem.min;
                        if (min > 0 && min == elem.value) {
                            elem.value = 0;
                        }
                        if (Number.isInteger(elem.hop)) {
                            elem.value = elem.value + elem.hop;
                        } else {
                            elem.value = (Number(elem.value) + Number(elem.hop)).toFixed(1);
                        }
                        elem.value = Number(elem.value);
                        if (elem.value > elem.max) {
                            elem.value = elem.max;
                        }
                    } else {
                        elem.value++;
                    }
                    MenuData.change(focused.namespace, focused.name, elem);
                    MenuData.submit(focused.namespace, focused.name, elem);
                    MenuData.render();
                }
            }
        }
    });

    $(document).on('click', '.close-button', function() {
        const focused = MenuData.getFocused();
        if (focused) {
            if (lastmenu != null && lastmenu != "undefined" && lastmenu != "") {
                // Jika dalam submenu, kembali ke menu sebelumnya
                MenuData.submit(focused.namespace, focused.name, "backup");
            } else {
                // Jika di menu utama, tutup menu
                MenuData.cancel(focused.namespace, focused.name);
                $.post("https://" + MenuData.ResourceName + "/closeui", JSON.stringify({}));
            }
        }
    });

    MenuData.open = function (namespace, name, data) {
        lastmenu = data.lastmenu;
        currentNamespace = namespace;
        currentName = name;
        menuElements = data.elements;

        if (typeof MenuData.opened[namespace] == "undefined") {
            MenuData.opened[namespace] = {};
        }

        if (typeof MenuData.opened[namespace][name] != "undefined") {
            MenuData.close(namespace, name);
        }

        if (typeof MenuData.pos[namespace] == "undefined") {
            MenuData.pos[namespace] = {};
        }

        for (let i = 0; i < data.elements.length; i++) {
            if (typeof data.elements[i].type == "undefined") {
                data.elements[i].type = "default";
            }
        }

        data._index = MenuData.focus.length;
        data._namespace = namespace;
        data._name = name;

        for (let i = 0; i < data.elements.length; i++) {
            data.elements[i]._namespace = namespace;
            data.elements[i]._name = name;
        }

        let selectedIndex = (typeof MenuData.pos[namespace][name] !== "undefined") ? MenuData.pos[namespace][name] : 0;
        for (let i = 0; i < data.elements.length; i++) {
            data.elements[i].selected = (i === selectedIndex);
        }

        MenuData.opened[namespace][name] = data;
        MenuData.pos[namespace][name] = 0;

        for (let i = 0; i < data.elements.length; i++) {
            if (data.elements[i].selected) {
                MenuData.pos[namespace][name] = i;
            } else {
                data.elements[i].selected = false;
            }
        }

        MenuData.focus.push({
            namespace: namespace,
            name: name,
        });

        MenuData.render();
        
        const menuId = `menu_${namespace}_${name}`;
        const savedPosition = localStorage.getItem(menuId);
        if (savedPosition) {
            const pos = JSON.parse(savedPosition);
            const menuElement = document.getElementById(menuId);
            if (menuElement) {
                menuElement.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
                xOffset = pos.x;
                yOffset = pos.y;
            }
        }

        let selectedElement = $("#menu_" + namespace + "_" + name).find(".menu-item.selected, .grid-item.selected");
        if (selectedElement.length > 0) {
            scrollToElement(selectedElement[0]);
        }
    };

    MenuData.close = function (namespace, name) {
        delete MenuData.opened[namespace][name];

        for (let i = 0; i < MenuData.focus.length; i++) {
            if (
                MenuData.focus[i].namespace == namespace &&
                MenuData.focus[i].name == name
            ) {
                MenuData.focus.splice(i, 1);
                break;
            }
        }

        MenuData.render();
    };

    MenuData.render = function () {
        let menuContainer = document.getElementById("menus");
        let focused = MenuData.getFocused();
        let currentTransforms = {};
        
        // Simpan semua posisi menu yang ada sebelum render
        for (let namespace in MenuData.opened) {
            for (let name in MenuData.opened[namespace]) {
                const menuId = `menu_${namespace}_${name}`;
                const menuElement = document.getElementById(menuId);
                if (menuElement) {
                    currentTransforms[menuId] = menuElement.style.transform;
                }
            }
        }

        menuContainer.innerHTML = "";
        $(menuContainer).hide();

        for (let namespace in MenuData.opened) {
            for (let name in MenuData.opened[namespace]) {
                let menuData = MenuData.opened[namespace][name];
                let view = JSON.parse(JSON.stringify(menuData));

                for (let i = 0; i < menuData.elements.length; i++) {
                    let element = view.elements[i];

                    switch (element.type) {
                        case "default":
                            element.list_id = i + 1;
                            element.list_max = menuData.elements.length;
                            break;

                        case "slider": {
                            element.isSlider = true;
                            element.list_id = i + 1;
                            element.list_max = menuData.elements.length;
                            element.sliderLabel =
                                typeof element.options == "undefined"
                                    ? element.value
                                    : element.options[element.value];

                            break;
                        }

                        default:
                            element.list_id = i + 1;
                            element.list_max = menuData.elements.length;
                            break;
                    }

                    if (i == MenuData.pos[namespace][name]) {
                        element.selected = true;
                    }
                }

                let menu = $(Mustache.render(MenuTpl, view))[0];
                $(menu).hide();
                menuContainer.appendChild(menu);

                // Terapkan posisi tersimpan dari localStorage atau posisi sebelumnya
                const menuId = `menu_${namespace}_${name}`;
                const savedPosition = localStorage.getItem(menuId);
                
                if (savedPosition) {
                    const pos = JSON.parse(savedPosition);
                    menu.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
                } else if (currentTransforms[menuId]) {
                    menu.style.transform = currentTransforms[menuId];
                }
            }
        }

        if (focused && focused.namespace && focused.name) {
            $("#menu_" + focused.namespace + "_" + focused.name).show();
        }

        $(menuContainer).show();
        
        if (focused && focused.namespace && focused.name) {
            let selectedElement = $("#menu_" + focused.namespace + "_" + focused.name).find(".menu-item.selected, .grid-item.selected");
            if (selectedElement.length > 0) {
                scrollToElement(selectedElement[0]);
            }
        }
    };

    MenuData.submit = function (namespace, name, data) {
        if (data == "backup") {
            $.post(
                "https://" + MenuData.ResourceName + "/menu_submit",
                JSON.stringify({
                    _namespace: namespace,
                    _name: name,
                    current: data,
                    trigger: lastmenu,
                    elements: MenuData.opened[namespace][name].elements,
                })
            );
        } else {
            $.post(
                "https://" + MenuData.ResourceName + "/menu_submit",
                JSON.stringify({
                    _namespace: namespace,
                    _name: name,
                    current: data,
                    elements: MenuData.opened[namespace][name].elements,
                })
            );
        }
    };

    MenuData.cancel = function (namespace, name) {
        $.post(
            "https://" + MenuData.ResourceName + "/menu_cancel",
            JSON.stringify({
                _namespace: namespace,
                _name: name,
            })
        );
    };

    MenuData.change = function (namespace, name, data) {
        $.post(
            "https://" + MenuData.ResourceName + "/menu_change",
            JSON.stringify({
                _namespace: namespace,
                _name: name,
                current: data,
                elements: MenuData.opened[namespace][name].elements,
            })
        );
    };

    MenuData.getFocused = function () {
        return MenuData.focus[MenuData.focus.length - 1];
    };

    window.onData = (data) => {
        if (!data || !data.ak_menubase_action) {
            console.error('Data tidak valid');
            return;
        }

        switch (data.ak_menubase_action) {
            case "openMenu": {
                if (!data.ak_menubase_namespace || !data.ak_menubase_name || !data.ak_menubase_data) {
                    console.error('Data menu tidak lengkap');
                    return;
                }
                MenuData.open(
                    data.ak_menubase_namespace,
                    data.ak_menubase_name,
                    data.ak_menubase_data
                );
                break;
            }

            case "closeMenu": {
                if (!data.ak_menubase_namespace || !data.ak_menubase_name) {
                    console.error('Data penutupan menu tidak lengkap');
                    return;
                }
                MenuData.close(data.ak_menubase_namespace, data.ak_menubase_name);
                break;
            }

            case "controlPressed": {
                switch (data.ak_menubase_control) {
                    case "ENTER": {
                        let focused = MenuData.getFocused();

                        if (typeof focused != "undefined") {
                            let menu = MenuData.opened[focused.namespace][focused.name];
                            let pos = MenuData.pos[focused.namespace][focused.name];
                            let elem = menu.elements[pos];

                            if (menu.elements.length > 0) {
                                MenuData.submit(focused.namespace, focused.name, elem);
                            }
                        }

                        break;
                    }

                    case "BACKSPACE": {
                        let focused = MenuData.getFocused();
                        if (lastmenu == null) {
                            lastmenu = "";
                        }
                        if (lastmenu != "undefined" && lastmenu != "") {
                            let menu = MenuData.opened[focused.namespace][focused.name];
                            let pos = MenuData.pos[focused.namespace][focused.name];
                            let elem = menu.elements[pos];
                            MenuData.submit(focused.namespace, focused.name, "backup");
                        } else if (typeof focused != "undefined") {
                            MenuData.cancel(focused.namespace, focused.name);
                            $.post(
                                "https://" + MenuData.ResourceName + "/closeui",
                                JSON.stringify({})
                            );
                        }
                        break;
                    }

                    case "TOP": {
                        let focused = MenuData.getFocused();

                        if (typeof focused != "undefined") {
                            let menu = MenuData.opened[focused.namespace][focused.name];
                            let pos = MenuData.pos[focused.namespace][focused.name];

                            if (pos > 0) {
                                MenuData.pos[focused.namespace][focused.name]--;
                            } else {
                                MenuData.pos[focused.namespace][focused.name] = menu.elements.length - 1;
                            }

                            let elem = menu.elements[MenuData.pos[focused.namespace][focused.name]];

                            for (let i = 0; i < menu.elements.length; i++) {
                                menu.elements[i].selected = (i == MenuData.pos[focused.namespace][focused.name]);
                            }

                            $.post('https://' + MenuData.ResourceName + '/update_last_selected', JSON.stringify({
                                _namespace: focused.namespace,
                                _name: focused.name,
                                selected: MenuData.pos[focused.namespace][focused.name]
                            }));

                            MenuData.change(focused.namespace, focused.name, elem);
                            MenuData.render();
                            $.post("https://" + MenuData.ResourceName + "/playsound");
                            let selectedElement = $("#menu_" + focused.namespace + "_" + focused.name).find(".menu-item.selected, .grid-item.selected");
                            if (selectedElement.length > 0) {
                                scrollToElement(selectedElement[0]);
                            }
                        }

                        break;
                    }

                    case "DOWN": {
                        let focused = MenuData.getFocused();

                        if (typeof focused != "undefined") {
                            let menu = MenuData.opened[focused.namespace][focused.name];
                            let pos = MenuData.pos[focused.namespace][focused.name];
                            let length = menu.elements.length;

                            if (pos < length - 1) {
                                MenuData.pos[focused.namespace][focused.name]++;
                            } else {
                                MenuData.pos[focused.namespace][focused.name] = 0;
                            }

                            let elem = menu.elements[MenuData.pos[focused.namespace][focused.name]];

                            for (let i = 0; i < menu.elements.length; i++) {
                                if (i == MenuData.pos[focused.namespace][focused.name]) {
                                    menu.elements[i].selected = true;
                                } else {
                                    menu.elements[i].selected = false;
                                }
                            }

                            $.post('https://' + MenuData.ResourceName + '/update_last_selected', JSON.stringify({
                                _namespace: focused.namespace,
                                _name: focused.name,
                                selected: MenuData.pos[focused.namespace][focused.name]
                            }));

                            MenuData.change(focused.namespace, focused.name, elem);
                            MenuData.render();
                            $.post("https://" + MenuData.ResourceName + "/playsound");
                            let selectedElement = $("#menu_" + focused.namespace + "_" + focused.name).find(".menu-item.selected, .grid-item.selected");
                            if (selectedElement.length > 0) {
                                scrollToElement(selectedElement[0]);
                            }
                        }

                        break;
                    }

                    case "LEFT": {
                        let focused = MenuData.getFocused();

                        if (typeof focused != "undefined") {
                            let menu = MenuData.opened[focused.namespace][focused.name];
                            let pos = MenuData.pos[focused.namespace][focused.name];
                            let elem = menu.elements[pos];

                            switch (elem.type) {
                                case "default":
                                    break;

                                case "slider": {
                                    let min = typeof elem.min == "undefined" ? 0 : elem.min;

                                    if (elem.value > min) {
                                        if (typeof elem.hop != "undefined") {
                                            if (Number.isInteger(elem.hop)) {
                                                elem.value = elem.value - elem.hop;
                                            } else {
                                                elem.value = (
                                                    Number(elem.value) - Number(elem.hop)
                                                ).toFixed(1);
                                            }

                                            elem.value = Number(elem.value);

                                            if (elem.value < min) {
                                                elem.value = min;
                                            }
                                        } else {
                                            elem.value--;
                                        }
                                        MenuData.change(focused.namespace, focused.name, elem);
                                        MenuData.submit(focused.namespace, focused.name, elem);
                                    }

                                    MenuData.render();
                                    break;
                                }

                                default:
                                    break;
                            }

                            let selectedElement = $("#menu_" + focused.namespace + "_" + focused.name).find(".menu-item.selected, .grid-item.selected");
                            if (selectedElement.length > 0) {
                                scrollToElement(selectedElement[0]);
                            }
                        }

                        break;
                    }

                    case "RIGHT": {
                        let focused = MenuData.getFocused();

                        if (typeof focused != "undefined") {
                            let menu = MenuData.opened[focused.namespace][focused.name];
                            let pos = MenuData.pos[focused.namespace][focused.name];
                            let elem = menu.elements[pos];

                            switch (elem.type) {
                                case "default":
                                    break;

                                case "slider": {
                                    if (typeof elem.options != "undefined" && elem.value < elem.options.length - 1) {
                                        elem.value++;
                                        MenuData.change(focused.namespace, focused.name, elem);
                                        MenuData.submit(focused.namespace, focused.name, elem);
                                    }

                                    if (typeof elem.max != "undefined" && elem.value < elem.max) {
                                        if (typeof elem.hop != "undefined") {
                                            let min = typeof elem.min == "undefined" ? 0 : elem.min;

                                            if (min > 0 && min == elem.value) {
                                                elem.value = 0;
                                            }

                                            if (Number.isInteger(elem.hop)) {
                                                elem.value = elem.value + elem.hop;
                                            } else {
                                                elem.value = (
                                                    Number(elem.value) + Number(elem.hop)
                                                ).toFixed(1);
                                            }

                                            elem.value = Number(elem.value);

                                            if (elem.value > elem.max) {
                                                elem.value = elem.max;
                                            }
                                        } else {
                                            elem.value++;
                                        }
                                        MenuData.change(focused.namespace, focused.name, elem);
                                        MenuData.submit(focused.namespace, focused.name, elem);
                                    }

                                    MenuData.render();
                                    break;
                                }

                                default:
                                    break;
                            }

                            let selectedElement = $("#menu_" + focused.namespace + "_" + focused.name).find(".menu-item.selected, .grid-item.selected");
                            if (selectedElement.length > 0) {
                                scrollToElement(selectedElement[0]);
                            }
                        }

                        break;
                    }

                    default:
                        break;
                }

                break;
            }
        }
    };

    window.onload = function (e) {
        window.addEventListener("message", (event) => {
            onData(event.data);
        });
    };
})();
