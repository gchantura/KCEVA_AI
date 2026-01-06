<script>
    import { onMount, afterUpdate } from 'svelte';

    let messages = [
        { role: 'assistant', content: 'გამარჯობა! მე ვარ თქვენი გერმანული ბიუროკრატიის ნავიგატორი. ატვირთეთ საბუთის ფოტო ან დამისვით კითხვა.' }
    ];
    let userInput = "";
    let fileInput;
    let loading = false;
    let chatContainer;

    // ავტომატური სკროლი ბოლოში
    afterUpdate(() => {
        if (chatContainer) {
            chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
        }
    });

    async function sendMessage() {
        if (!userInput && (!fileInput.files || !fileInput.files[0])) return;

        const currentInput = userInput;
        const currentFile = fileInput.files[0];

        // მომხმარებლის შეტყობინების დამატება ეკრანზე
        messages = [...messages, { 
            role: 'user', 
            content: currentInput || (currentFile ? "📷 სურათი აიტვირთა" : "") 
        }];
        
        userInput = "";
        loading = true;

        const formData = new FormData();
        formData.append('prompt', currentInput);
        if (currentFile) {
            formData.append('image', currentFile);
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            messages = [...messages, { role: 'assistant', content: data.text }];
        } catch (error) {
            messages = [...messages, { role: 'assistant', content: "კავშირის შეცდომა. სცადეთ მოგვიანებით." }];
        } finally {
            loading = false;
            if (fileInput) fileInput.value = ""; // ფაილის ველის გასუფთავება
        }
    }
</script>

<div class="flex flex-col h-screen bg-gray-50 font-sans">
    <header class="bg-blue-800 text-white p-5 shadow-md flex justify-between items-center">
        <div class="flex items-center gap-2">
            <span class="text-2xl">🇩🇪</span>
            <h1 class="font-bold text-lg tracking-tight">Legal Navigator AI</h1>
        </div>
        <span class="text-xs bg-blue-600 px-2 py-1 rounded">Beta</span>
    </header>

    <div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 space-y-4">
        {#each messages as msg}
            <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-[85%] p-4 rounded-2xl shadow-sm {msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}">
                    <p class="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
            </div>
        {/each}
        {#if loading}
            <div class="flex justify-start">
                <div class="bg-gray-200 p-3 rounded-lg animate-pulse text-gray-500 text-sm">ნავიგატორი აანალიზებს...</div>
            </div>
        {/if}
    </div>

    <div class="p-4 bg-white border-t shadow-2xl">
        <div class="max-w-4xl mx-auto space-y-3">
            <input 
                type="file" 
                accept="image/*" 
                bind:this={fileInput} 
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            <div class="flex gap-2">
                <input 
                    bind:value={userInput} 
                    on:keydown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="მაგ: რა წერია ამ საბუთში?" 
                    class="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button 
                    on:click={sendMessage} 
                    disabled={loading}
                    class="bg-blue-800 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-900 transition disabled:bg-gray-400"
                >
                    გაგზავნა
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    /* Tailwind-თან ერთად დამატებითი სტილი */
    :global(body) {
        margin: 0;
        padding: 0;
    }
</style>