    export function onlyDigits(v: string) {
        return (v || "").replace(/\D/g, "");
    }

    export function formatPhone(raw: string) {
        const d = onlyDigits(raw).slice(0, 11);

        if (d.length <= 2) return d;
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10)
            return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;

        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }
    
    export function formatCpfCnpj(raw: string) {
        const d = onlyDigits(raw);

        // CPF: 000.000.000-00
        if (d.length <= 11) {
            const p1 = d.slice(0, 3);
            const p2 = d.slice(3, 6);
            const p3 = d.slice(6, 9);
            const p4 = d.slice(9, 11);

            let out = p1;
            if (p2) out += "." + p2;
            if (p3) out += "." + p3;
            if (p4) out += "-" + p4;
            return out;
        }

        // CNPJ: 00.000.000/0000-00
        const c = d.slice(0, 14);
        const p1 = c.slice(0, 2);
        const p2 = c.slice(2, 5);
        const p3 = c.slice(5, 8);
        const p4 = c.slice(8, 12);
        const p5 = c.slice(12, 14);

        let out = p1;
        if (p2) out += "." + p2;
        if (p3) out += "." + p3;
        if (p4) out += "/" + p4;
        if (p5) out += "-" + p5;
        return out;
    }